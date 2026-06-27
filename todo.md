1. ~~Model tab - field type dropdown disappears when trying to scroll~~ ✅
2. ~~Model tab - Need to be able to create enum and use that in enums~~ ✅
3. ~~Model code generation~~ ✅
   - The should be a button to export all code at once, this button would be in the tabs container itself, for now it would only work for the models,
   - you should create a file for each of the model,
   - each file should be put in folder like `lib/model/${modelname.toSnakeCase()}.dart`
   - Below is example of one model code generation. this is just an example, try to think of all the stuff that can happen in fluter model code generation

```dart
import 'package:${project name}/model/${any other model file path}.dart'; // import like this if needed

class ${Class Name} {
  String ${Field Name};
  bool ${Field Name};
  int? ${Field Name};
  List<String> ${Field Name};

  ${Class Name}({
    required this.${Field Name},
    required this.${Field Name},
    required this.${Field Name},
    this.${Field Name},
  });

  ${Class Name} copyWith({
    String? ${Field Name},
    bool? ${Field Name},
    int? ${Field Name},
    List<String>? ${Field Name},
  }) {
    return ${Class Name}(
      ${Field Name}: ${Field Name} ?? this.${Field Name},
      ${Field Name}: ${Field Name} ?? this.${Field Name},
      ${Field Name}: ${Field Name} ?? this.${Field Name},
      ${Field Name}: ${Field Name} ?? this.${Field Name},
    );
  }

  factory ${Class Name}.fromJson(Map<String, dynamic> json) {
    return ${Class Name}(
      ${Field Name}: json['${Field Name}'],
      ${Field Name}: json['${Field Name}'],
      ${Field Name}: json['${Field Name}'],
      ${Field Name}: (json['${Field Name}'] as List).map((i) {
        return ImageModel.fromJson(i);
      }).toList(),
    );
  }

  static List<${Class Name}> fromJsonList(List<dynamic> json) {
    return json.map((item) => ${Class Name}.fromJson(item)).toList();
  }
}
```

4. ~~Api tab~~ ✅
    - Rename api tab to provider
    - each provider container i create also gets named, follows the same naming convention as color and typography
    - first i create a provider and under each provider i can create the apis
    - each apis also gets named
    - each provider also gets to set an output, same way as the apis
    - the output on an api can be also json, but not the output of the provider
    - if there any error in any tab, the export button gets disable and says 'fix error to export'
    - you should create a file for each of the provider,
    - each file should be put in folder like `lib/provider/${providername.toSnakeCase()}.dart`

5. ~~Provider tab code generation~~ ✅
    - Below is example of one provider code generation. this is just an example, try to think of all the stuff that can happen in fluter provider code generation

```dart
import 'package:${project name}/utils/print_helper.dart';
import 'package:${project name}/utils.dart' as utils;
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:${project name}/model/${model_file_name}.dart'; // path to any model that is used as output of any of the apis in the provider

@Riverpod(keepAlive: true)
class ${Provider Name}Notifier extends _$${Provider Name}Notifier {
  @override
  FutureOr<${Provider Output Model Name}?> build() async {
    return null;
  }


  Future<${Api Output (if output is json then this is dynamic)}?> ${apiName}() async {
    final response = await utils.CustomHttp.${apiMethod.toLoweCase()}(
      endpoint: '${end point}',
      header: {
        '${field name}': ${field value}
      },
      queries: {
        '${field name}': ${field value}
      },
      body: {
        '${field name}': ${field value}
      },
    );

    if (!response.ok) {
      printLine('Api endpoint error : ${response.status_code} : ${response.error}');
      return null;
    }

    // if output is a list of model 
    return ${Model Name}.fromJsonList(response.data as List);

    // if output is a model 
    return ${Model Name}.fromJson(response.data);

    // if output is json
    return response.data

    // if output is json list
    return response.data as List
  }
}
```