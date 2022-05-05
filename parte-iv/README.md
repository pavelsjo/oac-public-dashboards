# Refrescar el Token

En esta última parte vamos a automatizar el refrescamiento del token editando nuesto html, tomando en cuenta que el tiempo de refrescamiento sea menor a 100 segundos (10000ms):

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
        // parameters
        const URI = 'https://knooaaqzrwsvychkedrgdlkjzy.apigateway.sa-saopaulo-1.oci.customer-oci.com/v1/token';

        // function
        const fetchData = (URI) => {
            fetch(URI)
            .then(response => response.json())
            .then( token => {
                const params = ['jquery', 'knockout', 'obitech-application/application', 'ojs/ojcore', 'ojs/ojknockout', 'ojs/ojcomposite', 'jet-composites/oracle-dv/loader'];
                requirejs(params, ($, ko, application) => {
                    application.setSecurityConfig('token', {tokenAuthFunction: () => token.access_token });
                    ko.applyBindings();
                    });
            }).catch(error => console.log(error));
        };

        // init
        fetchData(URI);

        // refresh token
        setInterval(() =>  fetchData(URI), 90000);
    </script>
</html>
```
