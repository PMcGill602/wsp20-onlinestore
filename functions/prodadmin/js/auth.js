function auth(email, success, fail_url) {
    firebase.auth().onAuthStateChanged(user => {
        if (user && user.email === email) {
            success()
        } else {
            window.location.href = fail_url
        }
    })
}