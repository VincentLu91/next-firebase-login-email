import db from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { supabase } from "../utils/initSupabase";
import dayjs from "dayjs";

const migrateFirebaseData = async () => {
  // 1. products and prices
  // products table schema
  const productsRef = collection(db, `products`);
  const productsQuery = query(productsRef, where("active", "==", true));
  const productsSnapshot = await getDocs(productsQuery);
  /*productsSnapshot.forEach(async (productDoc) => {
    //const productDocId = productDoc.id;
    //console.log("productDoc is:", productDoc.data());
    //console.log("productDocId is:", productDoc.id);
    const productPayload = {
      stripe_product_id: productDoc.id,
      product_name: productDoc.data().name,
      product_role: productDoc.data().role,
      tax_code: productDoc.data().tax_code,
      description: productDoc.data().description,
      active: productDoc.data().active,
    };
    //console.log("productPayload is: ", productPayload);
    // upload products table
    let { data, error } = await supabase
      .from("products")
      .insert([productPayload])
      .select();
    if (error) {
      console.log("Cannot insert, see error: ");
      console.log(error);
    }
    if (data) {
      console.log("Success!");
      console.log(data);
    }

    // prices table schema
    const priceSnapshotList = query(
      collection(db, `products/${productDoc.id}/prices`)
    );
    const priceSnapshot = await getDocs(priceSnapshotList);
    priceSnapshot.forEach(async (priceDoc) => {
      //console.log("priceDoc is:", priceDoc.data());
      //console.log("priceDocId is:", priceDoc.id);
      const pricePayload = {
        stripe_price_id: priceDoc.id,
        product_id: data[0].id, //foreign ID that references product table,
        stripe_product_id: priceDoc.data().product,
        active: priceDoc.data().active,
        billing_scheme: priceDoc.data().billing_scheme,
        currency: priceDoc.data().currency,
        description: priceDoc.data().description,
        interval: priceDoc.data().interval,
        interval_count: priceDoc.data().interval_count,
        trial_period_days: priceDoc.data().trial_period_days,
        type: priceDoc.data().type,
        unit_amount: priceDoc.data().unit_amount,
      };
      //console.log("pricePayload is:", pricePayload);
      // use supabase to populate table
      let response = await supabase
        .from("prices")
        .insert([pricePayload])
        .select("*, products(*)");
      //.eq("id", "products.id");
      if (response.error) {
        console.log("Cannot insert, see error: ");
        console.log(response.error);
      }
      if (response.data) {
        console.log("Success!");
        console.log(response.data);
      }
    });
  });*/

  // 2.
  const customersRef = collection(db, `customers`);
  const customerData = await getDocs(customersRef);
  customerData.forEach(async (doc) => {
    let data = doc.data();
    const customerPayload = {
      email_address: data.email,
      stripe_link: data.stripeLink,
      stripe_id: data.stripeId,
    };

    let customerResponse = await supabase
      .from("customers")
      .insert([customerPayload])
      .select();
    if (customerResponse.error) {
      console.log("Cannot insert, see error: ");
      console.log(customerResponse.error);
    }
    if (customerResponse.data) {
      console.log("Customer Success!");
      console.log(customerResponse.data);
    }

    const subscriptionsRef = collection(
      db,
      `customers/${doc.id}/subscriptions`
    );
    const subscriptionsQuery = query(subscriptionsRef);
    const subscriptionSnapshot = await getDocs(subscriptionsQuery);
    subscriptionSnapshot.forEach(async (subscriptionDoc) => {
      /*console.log("subscriptionId is: ", subscriptionDoc.id);
      console.log(
        "subscription data is: ",
        subscriptionDoc.data().items.find((plan) => plan.id)
      );*/

      const stripePriceId = subscriptionDoc.data().items[0].price.id;
      const stripeProductId = subscriptionDoc.data().items[0].price.product.id;

      let priceAry = await supabase
        .from("prices")
        .select("*")
        .eq("stripe_price_id", stripePriceId);

      let productAry = await supabase
        .from("products")
        .select("*")
        .eq("stripe_product_id", stripeProductId);

      console.log(dayjs.unix(subscriptionDoc.data().created.seconds).format());

      //return

      const cancelAt = subscriptionDoc.data().cancel_at;
      const cancelAtPeriodEnd = subscriptionDoc.data().cancel_at_period_end;
      const currentPeriodEnd = subscriptionDoc.data().current_period_end;
      const currentPeriodStart = subscriptionDoc.data().current_period_start;

      const subscriptionPayload = {
        stripe_subscription_id: subscriptionDoc.id,
        cancel_at: cancelAt ? dayjs.unix(cancelAt.seconds).format() : null,
        cancel_at_period_end: cancelAtPeriodEnd
          ? dayjs.unix(cancelAtPeriodEnd.seconds).format()
          : null,
        created: dayjs.unix(subscriptionDoc.data().created.seconds).format(),
        current_period_end: currentPeriodEnd
          ? dayjs.unix(currentPeriodEnd.seconds)
          : null,
        current_period_start: currentPeriodStart
          ? dayjs.unix(currentPeriodStart.seconds)
          : null,
        price_id: priceAry.data[0].id,
        product_id: productAry.data[0].id,
        customer_id: customerResponse.data[0].id,
        stripe_price_id: stripePriceId,
        stripe_product_id: stripeProductId,
      };

      let subscriptionResponse = await supabase
        .from("subscriptions")
        .insert([subscriptionPayload])
        .select();
      if (subscriptionResponse.error) {
        console.log("Cannot insert, see error: ");
        console.log(subscriptionResponse.error);
      }
      if (subscriptionResponse.data) {
        console.log("Subscription Success!");
        console.log(subscriptionResponse.data);
      }

      //console.log("subscriptionPayload is: ", subscriptionPayload);
      const invoicesQuery = query(
        collection(
          db,
          `customers/${doc.id}/subscriptions/${subscriptionDoc.id}/invoices`
        )
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      invoicesSnapshot.forEach(async (invoiceDoc) => {
        //console.log("invoiceDoc: ", invoiceDoc.data().subscription);

        const invoicePayload = {
          subscription_id: subscriptionResponse.data[0].id, //foreign key to the subscriptions table,
          stripe_invoice_id: invoiceDoc.id,
          account_country: invoiceDoc.data().account_country,
          amount_due: invoiceDoc.data().amount_due,
          amount_paid: invoiceDoc.data().amount_paid,
          amount_remaining: invoiceDoc.data().amount_remaining,
        };
        //console.log("invoicePayload is: ", invoicePayload);
        let invoiceResponse = await supabase
          .from("invoices")
          .insert([invoicePayload])
          .select();
        if (invoiceResponse.error) {
          console.log("Cannot insert, see error: ");
          console.log(invoiceResponse.error);
        }
        if (invoiceResponse.data) {
          console.log("Invoice Success!");
          console.log(invoiceResponse.data);
        }
      });
    });

    // assuming we get the foreign keys from customers and invoices tables
    // payments table too much referencing and may not be needed, since stripe has history of payments
    /*const paymentsQuery = query(collection(db, `customers/${doc.id}/payments`));
    const paymentsSnapshot = await getDocs(paymentsQuery);
    paymentsSnapshot.forEach(async (paymentsDoc) => {
      console.log("paymentsDoc is: ", paymentsDoc.data());
      const paymentsPayload = {
        //customer_id: foreign key to customers table
        //invoice_id: foreign key to invoices table
        stripe_payments_id: paymentsDoc.id,
        amount: paymentsDoc.data().amount,
        amount_received: paymentsDoc.data().amount_received,
        //amount_refunded: paymentsDoc.data().items.find((charges) => charges.data),
        balance_transaction: paymentsDoc.data().balance_transaction,
        line1: paymentsDoc.data().line1,
        line2: paymentsDoc.data().line2,
        postal_code: paymentsDoc.data().postal_code,
        state: paymentsDoc.data().state,
        email: paymentsDoc.data().email,
        name: paymentsDoc.data().name,
        description: paymentsDoc.data().description,
    });*/

    /*const subscriptionsData = await getDocs(psubscriptionsRef);
    subscriptionsData.forEach((doc) => {
      data = doc.data(); /// <<<

      // firebase
      // const stripeProductIdInData = data.XYZ.stripe_product_id;
      // const stripePriceIdInData = data.XYZ.stripe_price_id;

      // fetch internal price id from firebase
      // const product = supabase.where(stripe_product_id: stripeProductIdInData)
      // const price = supabase.where(stripe_price_id: stripePriceIdInData)

      // const subscription = { customer_id: customer.id, canceled_at: data.XYZ , product_id: product.id, price_id: price.id }
      // save into supabase
      console.log(data);
    });
    //console.log("customerPayload: ", customerPayload);*/
    const micRecordingsRef = collection(db, `recordings/${doc.id}/files`);
    const micRecordingsQuery = query(micRecordingsRef);
    const micRecordingsSnapshot = await getDocs(micRecordingsQuery);
    micRecordingsSnapshot.forEach(async (micRecordingDoc) => {
      //console.log("micRecordingDoc is: ", micRecordingDoc.data());
      const duration = micRecordingDoc.data().duration;
      const micRecordingPayload = {
        customer_id: customerResponse.data[0].id, // foreign key to `customers` table
        original_file_name: micRecordingDoc.data().originalFilename,
        // the created_at timestamp is basically `recordingDate` from Firestore
        user_filestore_id: micRecordingDoc.data().user,
        duration: micRecordingDoc.data().duration,
        full_transcript: micRecordingDoc.data().transcript,
        file_name: micRecordingDoc.data().fileName,
      };
      //console.log("micRecordingPayload is: ", micRecordingPayload);
      let micRecordingResponse = await supabase
        .from("mic_recordings")
        .insert([micRecordingPayload])
        .select();
      if (micRecordingResponse.error) {
        console.log("Cannot insert, see error: ");
        console.log(micRecordingResponse.error);
      }
      if (micRecordingResponse.data) {
        console.log("micRecording Success!");
        console.log(micRecordingResponse.data);
      }
    });

    // leaving out call_recordings and telnyx_transcript_chunks tables since they're new.
  });
};

export default migrateFirebaseData;
