'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()), // creates express http server
  request = require('request'),
  fetch  = require('node-fetch');
const PAGE_ACCESS_TOKEN = "EAAisr0W2174BABxE3J7fOuItxSX9v6ZAeqtwQ5PV3MfEnkjxhTh7q4WZAA1hXuS0S48wyxxGM33xiCHEiakpCiknEoIqp5SOn4K5QxnnorPnVZAFYWRvyh85UelZBCllIbyQLuzqtqywNpPpvk2kieZAUFA5yETuXwbNZCRRgONgZDZD";
// Creates the endpoint for our webhook 

let mainMenuResponse = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
          "title": "We are here for you...",
          "subtitle": "What do you want to do?",
          // "image_url": attachment_url,
          "buttons": [
            {
              "type": "postback",
              "title": "See subjects",
              "payload": "seeSubjects",
            },
            // {
            //   "type": "postback",
            //   "title": "Get a Fashion tip",
            //   "payload": "fashionTip",
            // },
            // {
            //   "type": "postback",
            //   "title": "Film Industry",
            //   "payload": "celebrities",
            // }
          ],
        }]
      }
    }
}

app.post('/webhook', (req, res) => {  
 
    let body = req.body;
  
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
  
      // Iterates over each entry - there may be multiple if batched
      body.entry.forEach(function(entry) {
  
        // Gets the message. entry.messaging is an array, but 
        // will only ever contain one message, so we get index 0
        let webhook_event = entry.messaging[0];
        console.log(webhook_event);

        // Get the sender PSID
        let sender_psid = webhook_event.sender.id;
        console.log('Sender PSID: ' + sender_psid);

        // Check if the event is a message or postback and
        // pass the event to the appropriate handler function
        if (webhook_event.message) {
            handleMessage(sender_psid, webhook_event.message);        
        } else if (webhook_event.postback) {
            handlePostback(sender_psid, webhook_event.postback);
        }
        
    });
  
      // Returns a '200 OK' response to all requests
      res.status(200).send('EVENT_RECEIVED');
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  
  });

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "wattbaisgreat"
      
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
      
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
    
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        
        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);      
      }
    }
  });

function returnLessons (subjectNumber, sender_psid) {
    let response;
    request({
        uri: 'http://wattba.h9ssxfia9b.us-west-2.elasticbeanstalk.com/api/quick/chatbot/lessons?subject_id=' + subjectNumber
    }, function (err, res, body) {
            body = JSON.parse(body);
            var outputLessons = "";
            console.log("lessonBOdy: ", body);
            console.log("subject number is: ", subjectNumber);
            let elements = [];
            for (var i = 0; i < body.length; i++) {
                // outputLessons += (i+1) + ". " + "Title: " + body[i].title + "\n" + "Content: " + body[i].content + "\n";
                elements.push({
                    "title":body[i].title,
                    "image_url":body[i].image,
                    "subtitle":body[i].summary,
                    "default_action": {
                        "type": "web_url",
                        "url": "google.com",
                    },
                    "buttons": [
                        {
                            "type": "postback",
                            "title": "Know More",
                            "payload": "lesson_" //+ lesson_id
                        }
                    ]
                });
            }
            // response = {
            //     "text": outputLessons
            // }
            response = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type":"generic",
                        "elements": elements
                    }
                }
            }
            callSendAPI(sender_psid, response)
        })
}
// Handles messages events
function handleMessage(sender_psid, received_message) {
    let response;
    console.log(received_message.text);
    request({
        headers: {
            'Authorization': 'Bearer 6BBFKFZUO3HVNGL5U2ASTY56IHHWRNTA',
        },
        uri: 'https://api.wit.ai/message?v=20190429&q=' + encodeURI(received_message.text)
        }, function( err, res, body) {
            console.log('body is:', body);
            body = JSON.parse(body);
            if (body["entities"]["subjects"] != undefined) {
                request({
                    uri: 'http://wattba.h9ssxfia9b.us-west-2.elasticbeanstalk.com/api/v1/subjects/'
                }, function (err2, res2, body2) {
                        body2 = JSON.parse(body2);
                        var outputSubjects = "";
                        for (var i = 0; i < body2.count; i++) {
                            outputSubjects += (i+1) + ". " + body2.results[i].name + "\n";
                        }
                        response = {
                            "text": outputSubjects
                        }
                        callSendAPI(sender_psid, response).then(() => {
                            response = {
                                "text": "Please enter subject number like 'subject 1' to get lessons for subject 1"
                            }
                            return callSendAPI(sender_psid, response);
                        }); 
                    })
                }
            else if (body["entities"]["bye"] != undefined) {
                response = {
                    "text": "Ok, see you later"
                }
            }
            else if (body["entities"]["number"] != undefined) {
                console.log("subject: ", body);
                returnLessons(parseInt(body.entities.number[0].value), sender_psid);
            } 
            else {
                response = {
                    "text": "How can i help you?"
                }
                callSendAPI(sender_psid, response).then(() => {
                    return callSendAPI(sender_psid, mainMenuResponse);
                }) 
            }   

    });
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;
    console.log('r_payloafd:', payload);
    // Set the response based on the postback payload
    if (payload === "lesson_") { // which is for get_started
        let moreDetails = "Subject: Math\nGrade: 2\nContent: When you learn maths, you will be able to count... well sorta";
        response = {"text": moreDetails}
        callSendAPI(sender_psid, response);
    } else if (payload == "seeSubjects") {
        request({
            uri: 'http://wattba.h9ssxfia9b.us-west-2.elasticbeanstalk.com/api/v1/subjects/'
        }, function (err2, res2, body2) {
                body2 = JSON.parse(body2);
                let quick_replies = [];
                for (var i = 0; i < body2.count; i++) {
                    quick_replies.push(
                        {
                            "content_type":"text",
                            "title":body2.results[i].name,
                            "payload":"subject_id" + body2.results[i].id
                        }
                    );
                }
                    response = {
                        "text": "Choose from the subjects below",
                        "quick_replies":quick_replies    
                    }
                    callSendAPI(sender_psid, response);
            })
    } else if (payload.includes("subject_id")) {
        var res = parseInt(str.substring(10, ));
        returnLessons(res, sender_psid);
    }
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    // let request_body = {
    // "recipient": {
    //     "id": sender_psid
    // },
    // "message": response
    // }
      // Send the HTTP request to the Messenger Platform
    // request({
    //     "uri": "https://graph.facebook.com/v2.6/me/messages",
    //     "qs": { "access_token": PAGE_ACCESS_TOKEN },
    //     "method": "POST",
    //     "json": request_body
    // }, (err, res, body) => {
    //     if (!err) {
    //     console.log('message sent!')
    //     } else {
    //     console.error("Unable to send message:" + err);
    //     }
    // }); 
    let body = {
        recipient: {
          "id": sender_psid
        },
        "message": response
      };
      const qs = 'access_token=' + encodeURIComponent(PAGE_ACCESS_TOKEN); // Here you'll need to add your PAGE TOKEN from Facebook
      return fetch('https://graph.facebook.com/v2.6/me/messages?' + qs, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
}
// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));