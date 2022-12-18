const twilio = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_FROM_NUMBER = "+12184322463";

export default async function handler(req, res) {
  console.log("Running on localhost");
  const toPhoneNumber = req.body.toPhoneNumber;
  const messageText = req.body.messageText;
  twilio.messages
    .create({
      body: messageText,
      from: TWILIO_FROM_NUMBER,
      to: toPhoneNumber,
    })
    .then((message) => {
      res.send("Message sent");
    });
}
