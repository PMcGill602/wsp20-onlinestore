const functions = require('firebase-functions');
var admin = require("firebase-admin");

var serviceAccount = require("./patrickm-wsp20-firebase-adminsdk-kpneu-982b99a42e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://patrickm-wsp20.firebaseio.com"
});

const Constants = require('./myconstants.js')

async function createUser(req,res) {
    const email = req.body.email
    const password = req.body.password
    const displayName = req.body.displayName
    const phoneNumber = req.body.phoneNumber
    const photoURL = req.body.photoURL

    try {
        await admin.auth().createUser(
            {email,password,displayName,phoneNumber,photoURL}
        )
        res.render('signin.ejs', {page: 'signin', user: false, error: 'Account created! Sign in please', cartCount: 0})
    } catch (e) {
        res.render('signup.ejs', {error: e, user: false, page: 'signup', cartCount: 0})
    }
}

async function listUsers(req, res) {
    try {
        const userRecord = await admin.auth().listUsers()
        res.render('admin/listUsers.ejs', {users: userRecord.users, error: false})
    } catch (e) {
        res.render('admin/listUsers.ejs', {users: false, error: e})
    }
}

async function verifyIdToken(idToken) {
    try {
        const decodedIdToken = await admin.auth().verifyIdToken(idToken)
        return decodedIdToken
    } catch (e) {
        return null
    }
}

async function getOrderHistory(decodedIdToken) {
    try {
        const collection = admin.firestore().collection(Constants.COLL_ORDERS)
        let orders = []
        const snapshot = await collection.where("uid", "==", decodedIdToken.uid).orderBy("timestamp").get()
        snapshot.forEach(doc => {
            orders.push(doc.data())
        })
        return orders
    } catch (e) {
        return null
    }
}

async function checkOut(data) {
    data.timestamp = admin.firestore.Timestamp.fromDate(new Date())
    try {
        const orders = admin.firestore().collection(Constants.COLL_ORDERS)
        const products = admin.firestore().collection(Constants.COLL_PRODUCTS)
        await orders.doc().set(data)
        for (const item of data.cart) {
            const snapshot = admin.firestore().collection(Constants.COLL_PRODUCTS)
                .where("name", '==', item.product.name)
                .get()
            snapshot.forEach(doc => {
                var newQuantity = doc.data().quantity - item.qty
                products.doc(doc.id).set({
                    quantity: newQuantity
                }, {merge: true});
            })
        }
    } catch (e) {
        throw e
    }
}

async function checkQuantity(cart) {
    var count = 0
    for (const item of cart) {
        const snapshot = admin.firestore().collection(Constants.COLL_PRODUCTS)
            .where("name", '==', item.product.name)
            .get()
        snapshot.forEach(doc => {
            if(doc.data().quantity < item.qty) {
                return false
            } else
            count++
        })
        if (count >= cart.length)
            return true
    }
}

module.exports = {
    createUser,
    listUsers,
    verifyIdToken,
    getOrderHistory,
    checkOut,
    checkQuantity
}
