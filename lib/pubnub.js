import PubNub from "pubnub";

// paste below "publish message" comment
const publishMessage = async (channel, payload) => {
  const pubnub = new PubNub({
    publishKey: "pub-c-6b9eeb0b-bbaa-44ee-bab2-859a8f35724a",
    subscribeKey: "sub-c-99fbc867-98f7-469e-a595-6dab6e00a5ea",
    userId: "recreate-ai-user",
  });

  // With the right payload, you can publish a message, add a reaction to a message,
  // send a push notification, or send a small payload called a signal.
  const publishPayload = {
    channel,
    message: payload,
  };
  await pubnub.publish(publishPayload);
};

export { publishMessage };
