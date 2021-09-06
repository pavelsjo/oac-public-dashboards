const fdk = require("@fnproject/fdk");
const fetch = require("node-fetch");

const createToken = async () => {
    
    const url ="<URL TO IDCS INSTANCE>";

    const headers = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "authorization": "Basic <base64 encoded client ID:Client secret>"
    };
    const details = {
        "grant_type": "password",
        "username": "<username>",
        "password": "<password>",
        "scope": "<scope from IDCS confidential application>"
    };

    const formBody = [];
 
    for (let property in details) {
        let encodedKey = encodeURIComponent(property);
        let encodedValue = encodeURIComponent(details[property]);
        formBody.push(encodedKey + "=" + encodedValue);
        console.log(formBody);
    };

    formBody = formBody.join("&");
    console.log(formBody);
    const response = await fetch(url, { method: "POST", headers: headers, body: formBody});
    const data = response.json();

    return data;
};

fdk.handle( createToken() );