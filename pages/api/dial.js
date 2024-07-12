import Telnyx from "telnyx";

export default async function handler(req, res) {
  try {
    const telnyx = Telnyx(
      "KEY017EE15F9667935CDD8D6B422B40D671_Ko22qTGdS4engYHoawMjhB"
    );
    console.log(req.query);
    telnyx.calls
      .create({
        connection_id: "2071587752461206796", //"1833045987325642225",
        to: req.query.to,
        from: req.query.from,
        client_state: Buffer.from(req.query.customer_id).toString("base64"),
        record: "record-from-answer", // this parameter enables call recording to kick off when the user answers the phone
        // no need to manually make the record_start function call
        time_limit_secs: 20, // test out the auto-hang up once time limit is reached
      })
      .then(async (response) => {
        // call Recording

        const call = response.data;
        //console.log(call);

        res.status(200).send(call.call_control_id); // this returns the call_control_id.
        //res.status(200).send(call); // this returns the call object that contains the call_control_id and call_leg_id.
      });
  } catch (error) {}
}
