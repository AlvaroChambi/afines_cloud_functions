import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
export interface Client {
    email: string;
    password: string;
    userId: string;
    name: string;
    lastName1: string;
    lastName2: string;

    phone1: string;
    phone2: string;
    address: string;

    commercialName: string;
    businessName: string;

    clientType: string;
    subType: string;

    cp: string;

    dni: string;
    ccc: string;
    naf: string;

    iban: string;

    privileges: string;
}

export const createUser = functions.https.onRequest((request, response) => {
  response.set('Access-Control-Allow-Origin', '*');

  if (request.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    response.set('Access-Control-Allow-Methods', 'GET');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    response.set('Access-Control-Max-Age', '3600');
    response.status(204).send('');
    return
  }

  const promises: Array<Promise<any>> = []
  console.log(request.body)
  request.body.forEach( (client: Client) => {
    client.privileges = "USER"
    const promise = admin.auth().createUser({ email: client.email,
                                            password: client.password
    } ).then( userRecord => {
      client.userId = userRecord.uid;
      return admin.firestore().collection("profiles").doc(userRecord.uid).set(client);
    } ).then( snapshot => {
      console.log("Account created.");
    }).catch( error=> {
      console.log("email: " + client.email)
      console.log(error)
      response.status(500).send(error)
    } );
    promises.push(promise);
  } )
  return Promise.all(promises).then( _ => {
    response.status(201).send();
  }).catch( error => {
    response.status(500).send(error);
  } )
});

export interface Invoice {
  name: string;
  state: string;
}

export const rejectedNotification = functions.firestore
    .document('user/{userId}/invoices/{invoiceId}')
    .onWrite( (change, context) =>
{
      console.log(context.params.userId)
      console.log(context.params.invoiceId)
      const oldState = change.before.data()!.state;
      const newState = change.after.data()!.state;
      console.log("oldState: " + oldState)
      console.log(change.before.data())
      console.log("newState: " + newState)
      console.log(change.after.data())

      if(oldState != "REJECTED" && newState === "REJECTED") {
        return admin.firestore().collection("profiles").doc(context.params.userId).get()
          .then( doc => {
            console.log("Retrieved user profile")
            const userToken = doc.data()!.token;
            console.log(userToken)
            const message = {
              notification: {
                title: "Factura rechazada",
                body: "Una de tus facturas ha sido rechazada :(. Por favor vuelve a subirla."
              },
              token: userToken
            }
            return admin.messaging().send(message);
          } ).then( _ => {
            console.log("Message sent!")
          } ).catch( error => {
            console.log("Error on the process :(")
            console.log(error)
          } )
      }
      console.log("Not sending any message")
      return;
} );
