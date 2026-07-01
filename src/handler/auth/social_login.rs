use std::env;
use uuid::Uuid;
use chrono::Utc;
use serde_json::json;
use serde::{Deserialize};
use mongodb::bson::doc;
use actix_session::Session;
use crate::BuiltIns::{mongo::MongoDB, jwt};
use crate::utils::response::Response;
use actix_web::{web, Error, HttpResponse};
use crate::model::Account;

#[derive(Debug, Deserialize)]
pub struct ReqBody {
    provider: String,
    token: String,
}

#[derive(Debug, Deserialize)]
struct FirebaseUser {
    #[serde(rename = "localId")]
    local_id: String,
    email: Option<String>,
    #[serde(rename = "displayName")]
    display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FirebaseLookupResponse {
    users: Option<Vec<FirebaseUser>>,
}

pub async fn task(
    body: web::Json<ReqBody>,
    session: Session,
) -> Result<HttpResponse, Error> {
    let api_key = env::var("FIREBASE_WEB_API_KEY")
        .unwrap_or_default();

    if api_key.is_empty() {
        return Ok(Response::internal_server_error("Firebase API key not configured"));
    }

    // Verify the ID token with Firebase REST API
    let client = reqwest::Client::new();
    let verify_url = format!(
        "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={}",
        api_key
    );

    let firebase_res = client
        .post(&verify_url)
        .json(&json!({ "idToken": &body.token }))
        .send()
        .await;

    let firebase_res = match firebase_res {
        Ok(r) => r,
        Err(error) => {
            log::error!("Firebase verify error: {:?}", error);
            return Ok(Response::unauthorized("Failed to verify token"));
        }
    };

    if !firebase_res.status().is_success() {
        return Ok(Response::unauthorized("Invalid or expired token"));
    }

    let lookup: FirebaseLookupResponse = match firebase_res.json().await {
        Ok(v) => v,
        Err(error) => {
            log::error!("Firebase parse error: {:?}", error);
            return Ok(Response::internal_server_error("Failed to parse token response"));
        }
    };

    let fb_user = match lookup.users.and_then(|u| u.into_iter().next()) {
        Some(u) => u,
        None => return Ok(Response::unauthorized("User not found in Firebase")),
    };

    let email = match fb_user.email {
        Some(e) => e.to_lowercase(),
        None => return Ok(Response::bad_request("No email associated with this account")),
    };

    let db = MongoDB.connect();
    let now = Utc::now().timestamp_millis();
    let account_col = db.collection::<Account::AccountCore>("account_core");

    // Find existing account by email or create one
    let existing = account_col.find_one(doc!{ "email_address": &email }).await;
    if let Err(error) = existing {
        log::error!("{:?}", error);
        return Ok(Response::internal_server_error(&error.to_string()));
    }

    let user_id = match existing.unwrap() {
        Some(account) => account.uuid,
        None => {
            // Create a new account for first-time social login
            let new_id = Uuid::now_v7().to_string();
            let display_name = fb_user.display_name.unwrap_or_default();

            let new_account = Account::AccountCore {
                uuid: new_id.clone(),
                email_address: email.clone(),
                password: String::new(),
                email_verified: true,
                role: Account::AccountRole::User,
                two_a_factor_auth_enabled: false,
                two_a_factor_auth_updated: None,
                created_at: now,
                suspended_at: None,
                suspended_by: None,
            };

            if let Err(error) = account_col.insert_one(&new_account).await {
                log::error!("{:?}", error);
                return Ok(Response::internal_server_error(&error.to_string()));
            }

            // Create basic account profile
            let profile = Account::AccountProfile {
                uuid: new_id.clone(),
                full_name: display_name,
                phone_number: None,
                date_of_birth: None,
                gender: None,
                profile_picture: None,
                biography: None,
                profile_verified: false,
                modified_at: now,
            };
            let _ = db.collection::<Account::AccountProfile>("account_profile")
                .insert_one(&profile).await;

            new_id
        }
    };

    let (access_token, valid_minutes) = jwt::access_token::generate_default(
        &user_id,
        Account::AccountRole::User,
    );
    let access_token_valid_till = now + (valid_minutes as i64 * 60 * 1000);

    let refresh_token = match jwt::refresh_token::new(&user_id) {
        Ok(t) => t,
        Err(error) => {
            log::error!("{:?}", error);
            return Ok(Response::internal_server_error(&error.to_string()));
        }
    };

    session.insert("user_id", &user_id).ok();

    Ok(HttpResponse::Ok().content_type("application/json").json(json!({
        "access_token": access_token,
        "access_token_valid_till": access_token_valid_till,
        "refresh_token": refresh_token,
        "user_id": user_id,
        "role": "User",
    })))
}
