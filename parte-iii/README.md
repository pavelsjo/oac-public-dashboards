# Automatizar el Token

En esta ultima parte vamos a automatizar la generación del token usando Oracle Functions. Y como requisito previo debemos tener un `compartment` y una `Virtual Cloud Network (VCN)` en la cual trabajar. Si ya tienes esos componentes definidos puedes ir directo al paso 1.

## 0. Setup del compartment y VCN en OCI

Primero, el compartment o compartimiento en español, es simplemente una forma de agrupar nuestros recursos en la nube, ya que desta forma podremos auditar y administrar nuestros recursos. Debes ir a:

![img](media/funtions-0.png)

Allí a partir del `compartment root` debes crear un nuevo compartment que en este caso se llama `analytics`.

![img](media/funtions-1.png)

Luego debes ir a crear la VCN:

![img](media/funtions-2.png)

Asegurate de estar en el compartment correcto `Analytics` y puedes usar el `wizard` para crear rápidamente una VCN.

![img](media/funtions-3.png)

Deja las opciones por defecto e inicia el wizzard en el cual solo debes llenar el campo `VCN name` con el nombre de tu preferencia y que nosotros llamaremos `functionsvcn`

![img](media/funtions-4.png)

Dejando los demás parámetros por defecto puedes dar click en siguiente y crear.

## 1. Oracle Function para crear un Token

Debemos ir a functions desde la consola de OCI:

![img](media/funtions-5.png)

Allí debes crear una applicación y verificar que nosotros llamaremos `apptoken` y dentro de ella crearemos la función que creará nuestro token y la posicionaremos en la subnet pública de la vcn.

![img](media/funtions-6.png)

Este paso debes puedes seguir el paso a paso del `Cloud Shell Setup`, tomando en cuenta que:

```shell
fn list contextfn list context
fn use context sa-saopaulo-1
fn update context oracle.compartment-id ocid1.compartment.oc1..aaaaaaaagdzkgwhhrk7ysjfoyi7pz7eygs4rqrqjfccye6zc667rd6rl5bra
#cambia el valor de [OCIR-REPO] arbitrariamente
fn update context registry gru.ocir.io/grgqvoahscvk/oactoken
# usaremos node & el nombre sera oacfunction  
fn init --runtime node oacfunction
cd oacfunction
fn -v deploy --app apptoken
fn invoke apptoken oacfunction
```

En el código anterior lo que hacemos es usa `nodejs` como lenguaje de programación y creamos una función llamada `oacfunction` y luego hacemos el deploy, en ese sentido debiste ver un `{"message":"Hello World"}` que se mostró en la pantalla de la consola.

Si en este momento desde la consola usas el comando `ls` veras que se crearon tres archivos dentro de `oacfunction`:

- func.js
- func.yaml  
- package.json

En el `func.js` estará nuestra el código de nuestra función en el `package.json` estarán las dependencias para que nuestro codigo funciones y el `func.yaml` estaran unos parámetros que `fn` usa para dockerizar nuestra función.

Si sabes usar `vi` puedes usar el comando `vi funct.js` y verás el siguiente código:

```javascript
const fdk=require('@fnproject/fdk');

fdk.handle(function(input){
  let name = 'World';
  if (input.name) {
    name = input.name;
  }
  console.log('\nInside Node Hello World function')
  return {'message': 'Hello ' + name}
})
```

Y ese fue el código que se ejecutó cuando lanzamos el comando `fn invoke apptoken oacfunction`, entonces, lo que haremos será sobreescribir ese código para que nos cree un token.

**nota** si no sabes usar `vi` (:c) puedes crear un archivo local en tu pc que se llame `func.js` y luego cargarlo con la opción de la consola. Debes tomar en cuenta que el archivo se cargara en el root por lo que debes moverte usando el comando `..` y luego usar el `mv` para mover el archivo dentro de la carpeta `oacfunction`.

![img](media/funtions-7.png)

Luego el código base que usaremos será:

```javascript
// This is SAMPLE CODE illustrating how to obtain a token from IDCS using Oracle Functions service
const fdk=require('@fnproject/fdk');
const fetch = require('node-fetch');

fdk.handle(async function(){
    var url ='<URL TO IDCS INSTANCE>';
    var headers = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "authorization": "Basic <base64 encoded client ID:Client secret>"
    };

    let details = {
        "grant_type": "password",
        "username": "<username>",
        "password": "<password>",
        "scope": "<scope from IDCS confidential application>"
    };
    let formBody = [];
    
    for (let property in details) {
        let encodedKey = encodeURIComponent(property);
        let encodedValue = encodeURIComponent(details[property]);
        formBody.push(encodedKey + "=" + encodedValue);
        console.log(formBody);
    };

    formBody = formBody.join("&");
    console.log(formBody);
    const response = await fetch(url, { method: 'POST', headers: headers, body: formBody});
    const data = response.json();
    
    return data;
});
```

Debes editar los parametros `url`, `headers` y `details` con los mismos datos que usaste para generar el token desde la consola.

También debes actualizar el `package.json` con las siguientes dependencias:

```json
{
    "name": "oacfunction",
    "version": "1.0.0",
        "description": "Token function",
        "main": "oacfunction.js",
        "author": "",
        "license": "Apache-2.0",
        "dependencies": {
                "@fnproject/fdk": ">=0.0.26",
                "compat": "^1.0.4",
                "cookies": "^0.8.0",
                "extend": "^3.0.2",
                "http-signature": "^1.3.2",
                "node-fetch":"^2.6.0"
        }
}
```

Si tienes dudas, puedes ver un [ejemplo del código](parte-iii\functions) y cuando termines de actualizar los dos archivos
debes hacer un nuevo deploy:

```shell
fn -v deploy --app apptoken
```

Y si vuelves a invocar a la función `fn invoke apptoken oacfunction` recibirás el token.

## 2. Crear un Api gateway para invocar nuestra Funcion

El siguiente paso sera crear un `END POINT` al cual llamaremos para llamar a nuestra función, para ello crearemos un `API GATEWAY`:

![img](media/api-1.png)

Allí haremos click en `GATEWAY`, escribiremos un nombre `functionsgateway` también seleccionaremos que sea de tipo `Public` y la crearemos en la `Subnet Pública` y le damos crear.

Tardará unos minutos en crearse y cuanto termine iremos a `Deployments`.

![img](media/api-2.png)

En la configuración básica debemos definir un nombre y una ruta básica para nuestrod esarrollo y es importante agregar los dominios seguros en CORS:

![img](media/api-3.png)

Luego en Routes, creamos el END POINT para llamar a nuestra función:

![img](media/api-4.png)

Para que nuestro gateway funcione correctamente:

Es importante editemos las reglas de seguridad de la VCN, en la Ingress RULES:

- Stateless: No
- Source: 0.0.0.0
- IP Protocol: TCP
- Source Port Range: All
- Destination Port Range: 443

Y también que, agregemos una nueva policy cambiando el nombre del `compartment` y el `compartmentid`:

```sh
#policy
ALLOW any-user to use functions-family in compartment analytics where ALL {request.principal.type = 'ApiGateway', request.resource.compartment.id = 'ocid1.compartment.oc1..aaaaaaaa5jp2kvzdfbwlo3uftoxmsfubugvdfdfzf3tn4tsolk667sy57lqq'}
```

En este momento puedes usar el endpoint `https://lbx2s2aocvq72h5ztcog6bjhhe.apigateway.sa-saopaulo-1.oci.customer-oci.com/token` desde el navegador y obtendras el token.

## 3. Setup final de la página web

Finalmente hacemos un setup de neustra página:

```html
<!DOCTYPE html>
<html dir="ltr">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Oracle Analytics Cloud</title>
    </head>
    <body>
        <h1>Oracle Analytics Cloud</h1>
        <div style="position: absolute; width: 100%; height: 100%">
            <!-- dashboards -->
            <oracle-dv project-path="/@Catalog/shared/Sample/Sample Project"></oracle-dv>
        </div>
    </body>
    <script src="https://oac-grgqvoahscvk-gr.analytics.ocp.oraclecloud.com/public/dv/v1/embedding/standalone/embedding.js" type="application/javascript"></script>
    <script>
        var Url = 'https://lbx2s2aocvq72h5ztcog6bjhhe.apigateway.sa-saopaulo-1.oci.customer-oci.com/token';
        var token_request = new XMLHttpRequest();
        token_request.open("GET", Url, false);
        token_request.send(null);
        {
            if (token_request.status = 200) {
                var idcs_token = JSON.parse(token_request.response).access_token; 
                requirejs(['jquery', 'knockout', 'obitech-application/application', 'ojs/ojcore', 'ojs/ojknockout', 'ojs/ojcomposite', 'jet-composites/oracle-dv/loader'],
                    function ($, ko, application) {
                        application.setSecurityConfig("token", {
                            tokenAuthFunction:
                                function () {
                                    return idcs_token;
                                }
                        });
                        ko.applyBindings();
                    }
                );
            } else {
                console.log(`error ${token_request.status} ${token_request.statusText}`)
            }
        }
    </script>
</html>
```
