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

 //backend

 const session = require('express-session')
 app.use(session(
     {
         secret: 'anysecretstring.fasfasfgafa',
         saveUninitialized: false,
         resave: false
     }
 ))

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
    const cartCount = req.session.cart ? req.session.cart.length : 0
    const coll = firebase.firestore().collection(Constants.COLL_PRODUCTS)
    try {
        let products = []
        const snapshot = await coll.orderBy("name").get()
        snapshot.forEach(doc => {
            products.push({id: doc.id, data: doc.data()})
        })
        res.render('storefront.ejs', {error: false, products, user: req.user, cartCount})
    } catch (e) {
        res.render('storefront.ejs', {error: e, user: req.user, cartCount})
    }
})

app.get('/b/about', auth, (req, res) => {
    const cartCount = req.session.cart ? req.session.cart.length : 0
    res.render('about.ejs', {user: req.user, cartCount})
})

app.get('/b/contact', auth, (req, res) => {
    const cartCount = req.session.cart ? req.session.cart.length : 0
    res.render('contact.ejs', {user: req.user, cartCount})
})

app.get('/b/signin', (req, res) => {
    res.render('signin.ejs', {error: false, user: req.user, cartCount: 0})
})

app.post('/b/signin', async (req, res) => {
    const email = req.body.email
    const password = req.body.password
    const auth = firebase.auth()
    try {
        const userRecord = await auth.signInWithEmailAndPassword(email, password)
        if(userRecord.user.email === Constants.SYSADMINEMAIL) {
            res.redirect('/admin/sysadmin')
        } else {
            if (!req.session.cart) {
            res.redirect('/')
            } else {
                res.redirect('/b/shoppingcart')
            }
        }
    }
    catch (e) {
        res.render('signin', {error: e, user: req.user, cartCount: 0})
    }
})

app.get('/b/signout', async (req,res) => {
    try {
        req.session.cart = null
        await firebase.auth().signOut()
        res.redirect('/')
    } catch (e) {
        res.send('Error: sign out')
    }
})

app.get('/b/profile', authAndRedirectSignIn, (req,res) => {
        const cartCount = req.session.cart ? req.session.cart.length : 0
        res.render('profile', {user: req.user, cartCount, orders: false})
})

app.get('/b/signup', (req,res) => {
    res.render('signup.ejs', {page: 'signup', user: null, error: false, cartCount: 0})
})

const ShoppingCart = require('./model/ShoppingCart.js')

app.post('/b/add2cart', async (req,res) => {
    const id = req.body.docId
    const collection = firebase.firestore().collection(Constants.COLL_PRODUCTS)
    try {
            const doc = await collection.doc(id).get()
            let cart
            if(!req.session.cart) {
                cart = new ShoppingCart()
            } else {
                cart = ShoppingCart.deserialize(req.session.cart)
            }
            const {name,price,summary,image,image_url} = doc.data()
            cart.add({id,name,price,summary,image,image_url})
            req.session.cart = cart.serialize()
            res.redirect('/b/shoppingcart')
    } catch (e) {
        res.send(JSON.stringify(e))
    }
})

app.get('/b/shoppingcart', authAndRedirectSignIn, (req,res) => {
    let cart
    if(!req.session.cart) {
        cart = new ShoppingCart()
    } else {
        cart = ShoppingCart.deserialize(req.session.cart)
    }
    res.render('shoppingcart.ejs', {message: false, cart, user: req.user, cartCount: cart.contents.length})
})

app.post('/b/checkout', authAndRedirectSignIn, async (req,res) => {
    if(!req.session.cart) {
        return res.send('Shopping Cart is Empty')
    }
    const data = {
        uid: req.user.uid,
        timestamp: firebase.firestore.Timestamp.fromDate(new Date()),
        cart: req.session.cart
    }

    try {
        const collection = firebase.firestore().collection(Constants.COLL_ORDERS)
        await collection.doc().set(data)
        req.session.cart = null
        res.render('shoppingcart.ejs', {message: 'Checked Out Successfully', cart : new ShoppingCart(), user: req.user, cartCount: 0})
    } catch (e) {
        const cart = ShoppingCart.deserialize(req.session.cart)
        res.render('shoppingcart.ejs', {message: 'Checkout Failed. Try Again Later', cart, user: req.user, cartCount: cart.contents.length})
    }

})

app.get('/b/orderhistory', authAndRedirectSignIn, async (req,res) => {
    try {
        const collection = firebase.firestore().collection(Constants.COLL_ORDERS)
        let orders = []
        const snapshot = await collection.where("uid", "==", req.user.uid).orderBy("timestamp").get()
        snapshot.forEach(doc => {
            orders.push(doc.data())
        })
        res.render('profile.ejs', {user: req.user, cartCount: 0, orders})
    } catch (e) {
        console.log("========", e)
        res.send('<h1>Order History Error</h1>')
    }
})

//middleware

function authAndRedirectSignIn (req, res, next) {
    const user = firebase.auth().currentUser
    if (!user) {
        res.redirect('/b/signin')
    } else {
        req.user = user
        return next()
    }
}

function auth(req, res, next) {
    req.user = firebase.auth().currentUser
    next()
}

const adminUtil = require('./adminUtil.js')

//admin api
app.post('/admin/signup', (req,res) => {
    return adminUtil.createUser(req, res)
})

app.get('/admin/sysadmin', authSysAdmin, (req,res) => {
    res.render('admin/sysadmin.ejs')
})

app.get('/admin/listUsers', authSysAdmin, (req, res) => {
    return adminUtil.listUsers(req, res)
})

function authSysAdmin(req, res, next) {
    const user = firebase.auth().currentUser
    if(!user || !user.email || user.email !== Constants.SYSADMINEMAIL) {
        res.send('<h1>System Admin Page: Access Denied</h1>')
    } else {
        return next()
    }
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
