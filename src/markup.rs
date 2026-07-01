use actix_web::{Error, HttpResponse, error, web};
use tera::{Context, Tera};

pub async fn home(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("home.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn auth(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("auth.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn editor(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("editor.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}

pub async fn dashboard(template: web::Data<Tera>) -> Result<HttpResponse, Error> {
    let res_data = template
        .render("dashboard.html", &Context::new())
        .map_err(|e| error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().content_type("text/html").body(res_data))
}
