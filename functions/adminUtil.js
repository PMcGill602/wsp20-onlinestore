var admin = require("firebase-admin");

var serviceAccount = require("./patrickm-wsp20-firebase-adminsdk-kpneu-982b99a42e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://patrickm-wsp20.firebaseio.com"
});

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

module.exports = {
    createUser,
    listUsers
}
