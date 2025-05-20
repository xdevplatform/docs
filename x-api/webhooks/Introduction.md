---

# V2 Webhooks API 

[V2 Account Activity API](#v2-webhooks-api)

[Overview](#overview)

[Feature summary](#feature-summary)

[Manage Webhooks](#manage-webhooks)

[1\. Develop A Webhook Consumer App](#1.-develop-a-webhook-consumer-app)

[2\. Securing Webhooks](#2.-securing-webhooks)

[3\. The Webhooks API](#3.-the-webhooks-api)

[4\. The CRC Check](#4.-the-crc-check)

---

## Overview 

The V2 Webhooks API enables developers to receive real-time event notifications from X accounts via webhook-based JSON messages. These APIs allow you to register and manage webhooks, develop consumer applications to process events, and ensure secure communication through challenge-response checks (CRC) and signature headers.

## Feature Summary 

| Tier | Pricing | Number of webhooks |
| :---: | :---: | :---: |
| Self-Serve Pro | $5000/mo | 1 |
| Enterprise | [Contact sales](https://docs.x.com/resources/enterprise/forms/enterprise-api-interest#enterprise-access-form) | 5+ |

## Products That Support Webhooks

These are the products that currently support delivering events via webhook:

- Account Activity API (AAA)  
- FilteredStream (planned)

## Manage Webhooks 

The Account Activity API provides you webhook-based JSON messages any time there are events associated with X accounts subscribed to your service. X delivers those activities to your registered webhook. In the following steps, you will learn how to manage webhooks and subscribed users.

You will learn how to register, view, and remove, both webhooks and subscribed users. We'll be using simple cURL commands to make requests to the various API endpoints. cURL is a command-line tool for getting or sending requests using the URL syntax.

There are several details that need attention before you can start receiving webhook events in your event consumer application. As described below, you will need to create an X app, obtain Account Activity API access, and develop a web app that consumes webhook events. 

### 1\. Develop A Webhook Consumer App 

In order to register a new webhook associated with your X app, you’ll need to develop, deploy and host a web app that receives X webhook events, and responds to our security requests.

*Before you get started, we recommend checking out our [sample apps](#sample-apps)\!*

* Create a web app with a publicly accessible HTTPS URL that will act as the webhook endpoint to receive events.   
  * The URI *path* is completely up to you. This example would be valid: [https://mydomain.com/service/listen](https://mydomain.com/service/listen)  
  * If you are listening for webhooks from a variety of sources, a common pattern is: [https://mydomain.com/webhook/twitter](https://mydomain.com/webhook/twitter)  
  * Note that the specified URL cannot include a port specification ([https://mydomain.com:5000/NoWorkie](https://mydomain.com:5000/NoWorkie)).
* A first step is writing code that receives a X Challenge Response Check (CRC) GET request and responds with a properly formatted JSON response.   
* Register your webhook URL. You will make a POST request to a /2/webhooks endpoint with the URL in the json body. When you make this request X will send a CRC request to your web app.  
* When a webhook is successfully registered, the response will include a webhook id. This webhook id is needed later when making requests to products that support webhooks.   
* X will send POST requests containing events to the URL you registered. These events will be encoded in JSON. See [HERE](http:///x-api/account-activity/fundamentals#account-activity-data-object-structure) for example webhook JSON payloads.

#### Optional: Use xurl for testing

For testing purposes, the xurl tool now supports temporary webhooks\! Install the latest version of the [`xurl` project](https://github.com/xdevplatform/xurl) from GitHub, configure your authorization, then run:

```
xurl webhook start
```

This will generate a temporary public webhook URL, automatically handle all CRC checks, and log any incoming subscription events. It’s a great way to verify your setup before deploying. Example output:

```
Starting webhook server with ngrok...
Enter your ngrok authtoken (leave empty to try NGROK_AUTHTOKEN env var):

Attempting to use NGROK_AUTHTOKEN environment variable for ngrok authentication.
Configuring ngrok to forward to local port: 8080
Ngrok tunnel established!
  Forwarding URL: https://<your-ngrok-subdomain>.ngrok-free.app -> localhost:8080

Use this URL for your X API webhook registration: https://<your-ngrok-subdomain>.ngrok-free.app/webhook

Starting local HTTP server to handle requests from ngrok tunnel (forwarded from https://<your-ngrok-subdomain>.ngrok-free.app)...
```

**Important Notes**

* When registering your webhook URL, your web app needs to use your app’s consumer secret for the encryption of the CRC check.

* All incoming Direct Messages will be delivered via webhooks. All Direct Messages sent via [POST /2/dm\_conversations/with/:participant\_id/messages](https://docs.x.com/x-api/direct-messages/send-a-new-message-to-a-user) will also be delivered via webhooks. This is so your web app can be aware of Direct Messages sent via a different client.  
    
* If you have more than one web app sharing the same webhook URL and the same user mapped to each app, the same event will be sent to your webhook multiple times (once per web app).  
    
* In some cases, your webhook may receive duplicate events. Your webhook app should be tolerant of this and dedupe by event ID.  
    
* See example code:  
    
  * [Enterprise Account Activity API Setup](https://github.com/m-rosinsky/XWebhookTest), a node web app that displays webhook events using the enterprise tier of the Account Activity API.

### 2\. Securing Webhooks 

X's webhook-based APIs provide two methods for confirming the security of your webhook server:

1. The challenge-response checks enable X to confirm the ownership of the web app receiving webhook events.   
2. The signature header in each POST request enables you to confirm that X is the source of the incoming webhooks.

See the CRC Check section for implementation requirements.

### 3\. The Webhooks API

Webhooks are managed through the Webhook Management API. All endpoints require OAuth2 App Only Bearer Token authentication.

#### Adding a webhook

**POST /2/webhooks**

**Description:**

Create a webhook configuration. Your publicly accessible `https` callback URL must be passed in the JSON body.  
Let’s begin with registering a new webhook URL for the given application context.

**Authentication:**

OAuth2 App Only Bearer Token

* **Bearer token** `<BEARER_TOKEN>` e.g. `AAAAAAAAAAAA0%2EUifi76ZC9Ub0wn...`

**Parameters (JSON Body):**

```
{
    "url": "<your publicly accessible https callback url>"
}
```

* **URL** `<URL>` e.g. `https://yourdomain.com/webhooks/twitter/`

**Request:** Copy the following cURL request into your command line after making changes to the following:

````
  ```
  curl --request POST --url 'https://api.twitter.com/2/webhooks?url=<URL>' --header 'authorization: Bearer <BEARER_TOKEN>'
  --data '{
"url": "https://yourdomain.com/webhooks/twitter"
          }'
  ```
````

**Responses:**

**Success (200 OK)**

A successful response indicates the webhook was created and the initial CRC check passed.

```
{
  "data": {
    "id": "<webhook_id>",
    "url": "<your callback url>",
    "valid": true,
    "created_at": "YYYY-mm-DDTHH:MM:ss.000Z"
  }
}
```

**Failure (400 Bad Request)**

Failures return a standard error object.

```
{
    "errors": [
      {
        "message": "<Reason>: <Details>"
      }
    ],
    "title": "Invalid Request",
    "detail": "One or more parameters to your request was invalid.",
    "type": "https://api.twitter.com/2/problems/invalid-request"
}
```

Common reasons for failure include:

| Reason | Description |
| :---- | :---- |
| `CrcValidationFailed` | The callback URL did not respond correctly to the CRC check (e.g., timed out, wrong response). |
| `UrlValidationFailed` | The callback URL provided does not meet requirements (e.g., not `https`, invalid format). |
| `DuplicateUrlFailed` | A webhook is already registered by your application for the provided callback URL. |
| `WebhookLimitExceeded` | Your application has reached the maximum number of allowed webhook configurations. |

#### Viewing a webhook

**GET /2/webhooks**

**Description:** Retrieve all webhook configurations associated with your application (developer account).

**Authentication:**

OAuth2 App Only Bearer Token

* **Bearer token** `<BEARER_TOKEN>` e.g. `AAAAAAAAAAAA0%2EUifi76ZC9Ub0wn...`

**Parameters (JSON Body):**

```
{
    "url": "<your publicly accessible https callback url>"
}
```

* **URL** `<URL>` e.g. `https://yourdomain.com/webhooks/twitter/`

**Request:** Run the following command to retrieve all registered webhook URLs and their statuses for the given application.

Copy the following cURL request into your command line after making changes to the following:

````
  ```
  curl --request GET --url 'https://api.twitter.com/2/webhooks' --header 'authorization: Bearer <BEARER_TOKEN>'
  ```
````

**Success (200 OK)**

Returns a list of webhook configurations. The list will be empty if no webhooks are configured.

*Example (with one webhook configured):*

```
{
  "data": [
    {
      "created_at": "YYYY-mm-DDTHH:MM:ss.000Z",
      "id": "<webhook_id>",
      "url": "<callback url>",
      "valid": true
    }
  ],
  "meta": {
    "result_count": 1
  }
}
```

*Example (with no webhooks configured):*

```
{
  "data": [],
  "meta": {
    "result_count": 0
  }
}
```

#### Removing a webhook

DELETE /2/webhooks/:webhook\_id

**Description:** Delete a webhook configuration using its specific `webhook_id`. The ID can be obtained from the `POST /2/webhooks` creation response or the `GET /2/webhooks` listing response.

**Authentication:**

OAuth2 App Only Bearer Token

* **Bearer token** `<BEARER_TOKEN>` e.g. `AAAAAAAAAAAA0%2EUifi76ZC9Ub0wn...`

**Path Parameters:**

| Parameter | Description |
| :---- | :---- |
| `webhook_id` | The ID of the webhook to delete. |

**Request:** Run the following command to remove the webhook from the provided application's configuration.

Copy the following cURL request into your command line after making changes to the following:

````
  ```
  curl --request DELETE --url 'https://api.twitter.com/2/webhooks/:WEBHOOK_ID' --header 'authorization: Bearer <BEARER_TOKEN>'
  ```

  **Responses:**
````

**Success (200 OK)**

Returns a json response with "deleted" status true if successfully deleted.

*Example (with successful deletion of webhook):*

```
{
  "data": {
    "deleted": true
  }
}
```

**Failure (400 Bad Request)**

| Reason | Description |
| :---- | :---- |
| `WebhookIdInvalid` | The provided `webhook_id` was not found or is not associated with your app. |

#### Validate and Reenable webhook

**PUT /2/webhooks/:webhook\_id**

**Description:** Triggers the challenge response check (CRC) for the given webhook's URL. If the check is successful, returns 200 and reenables the webhook by setting its status to `valid`.

**Authentication:**

OAuth2 App Only Bearer Token

* **Bearer token** `<BEARER_TOKEN>` e.g. `AAAAAAAAAAAA0%2EUifi76ZC9Ub0wn...`

**Path Parameters:**

| Parameter | Description |
| :---- | :---- |
| `webhook_id` | The ID of the webhook to validate. |

**Request:** Run the following command to validate the webhook from the provided application's configuration.

Copy the following cURL request into your command line after making changes to the following:

````
  ```
  curl --request PUT --url 'https://api.twitter.com/2/webhooks/:WEBHOOK_ID' --header 'authorization: Bearer <BEARER_TOKEN>'
  ```

  **Responses:**
````

**Success (200 OK)**

A 200 OK response indicates that the CRC check request was *initiated*. It does **not** guarantee that the CRC check passed. The `valid` field in the response reflects the status *after* the check attempt. If the CRC check succeeds, the webhook's status will be updated to valid. You can verify the current status using `GET /2/webhooks`.

```
{
  "data": {
    "valid": true // Indicates the status after the CRC check attempt completes
  }
}
```

**Failure (400 Bad Request)**

| Reason | Description |
| :---- | :---- |
| `WebhookIdInvalid` | The provided `webhook_id` was not found or is not associated with your app. |
| `CrcValidationFailed` | The callback URL did not respond correctly to the CRC check request. |

### 4\. The CRC Check 

The Challenge Response Check (CRC) is how X validates that the callback URL you provided is valid and that you control it.

**When CRC is triggered:**

* On initial webhook registration (`POST /2/webhooks`)  
* Hourly by X to validate  
* Manually via `PUT /2/webhooks/:id`

Example: 

```
GET https://your-webhook-url.com/webhook?crc_token=challenge_string
```

Example JSON Response Body:

```
{
  "response_token": "sha256=<base64_encoded_hmac_hash>"
}
```

**How to Build the Response:**

* Use crc\_token as the message  
* Use the app’s **consumer secret** as the key  
* Create an HMAC SHA-256 hash  
* Base64 encode the result

## Sample Apps

* [Simple webhook server](https://github.com/m-rosinsky/XWebhookTest/blob/main/app.py)  
  * A single python script that shows you how to respond to the CRC check and accept POST events.  
* [Account Activity API sample dashboard](https://github.com/xdevplatform/account-activity-dashboard-enterprise/tree/master)  
  * A web app written with [bun.sh](https://bun.sh) that allows you to manage webhooks, subscriptions, and receive live events directly in the app.