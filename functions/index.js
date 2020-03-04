const functions = require('firebase-functions');
const express = require('express')
const path = require('path')
const app = express()

 exports.httpReq = functions.https.onRequest(app)

 app.use(express.urlencoded({extended: false}))
 app.use('/public', express.static(path.join(__dirname, '/static')))

 app.set('view engine', 'ejs')
 app.set('views', './ejsviews')

function frontendHandler(req, res) {
    res.sendFile(path.join(__dirname, '/prodadmin/prodadmin.html'))
}

 app.get('/login', frontendHandler)
 app.get('/home', frontendHandler)
 app.get('/add', frontendHandler)
 app.get('/show', frontendHandler)

 const firebase = require('firebase')

 const firebaseConfig = {
    apiKey: "AIzaSyDiARe6pD_ibeR0WFqTpGw-MKVB0BEpgE0",
    authDomain: "patrickm-wsp20.firebaseapp.com",
    databaseURL: "https://patrickm-wsp20.firebaseio.com",
    projectId: "patrickm-wsp20",
    storageBucket: "patrickm-wsp20.appspot.com",
    messagingSenderId: "289545602645",
    appId: "1:289545602645:web:ff589afcb622897d2936dc"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  const Constants = require('./myconstants.js')

 app.get('/',  auth, async(req, res) => {
    const coll = firebase.firestore().collection(Constants.COLL_PRODUCTS)
    try {
        let products = []
        const snapshot = await coll.orderBy("name").get()
        snapshot.forEach(doc => {
            products.push({id: doc.id, data: doc.data()})
        })
        res.render('storefront.ejs', {error: false, products, user: req.user})
    } catch (e) {
        res.render('storefront.ejs', {error: e, user: req.user})
    }
})

app.get('/b/about', auth, (req, res) => {
    res.render('about.ejs', {user: req.user})
})

app.get('/b/contact', auth, (req, res) => {
    res.render('contact.ejs', {user: req.user})
})

app.get('/b/signin', (req, res) => {
    res.render('signin.ejs', {error: false, user: req.user})
})

app.post('/b/signin', async (req, res) => {
    const email = req.body.email
    const password = req.body.password
    const auth = firebase.auth()
    try {
        const user = await auth.signInWithEmailAndPassword(email, password)
        res.redirect('/')
    }
    catch (e) {
        res.render('signin', {error: e, user: req.user})
    }
})

app.get('/b/signout', async (req,res) => {
    try {
        await firebase.auth().signOut()
        res.redirect('/')
    } catch (e) {
        res.send('Error: sign out')
    }
})

app.get('/b/profile', auth, (req,res) => {
    if (!req.user) {
        res.redirect('/b/signin')
    } else {
        res.render('profile', {user: req.user})
    }
})

//middleware

function auth(req, res, next) {
    req.user = firebase.auth().currentUser
    next()
}

//test code

app.get('/testlogin', (req, res) => {
    res.sendFile(path.join(__dirname, 'static/html/login.html'))
})

app.post('/testsignIn', (req, res) => {
    const email = req.body.email
    const password = req.body.password
    // let page = `
    //     (POST) You entered: ${email} and ${password}
    //`;
    //res.send(page)
    const obj = {
        a: email,
        b: password,
        c: 'login success'
    }
    res.render('home', obj)
})

app.get('/testsignIn', (req, res) => {
    const email = req.query.email
    const password = req.query.password
    let page = `
        You entered: ${email} and ${password}
    `;
    res.send(page)
})
