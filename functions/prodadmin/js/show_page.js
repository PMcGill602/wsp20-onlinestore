function show_page() {
    auth('prodadmin@test.com', show_page_secured, '/login')
}

let products; //list of products read from db

async function show_page_secured() {
    glPageContent.innerHTML = '<h1>Show Products</h1>'
    glPageContent.innerHTML += `
        <a href="/home" class="btn btn-outline-primary">Home</a>
        <a href="/add" class="btn btn-outline-primary">Add A Product</a>
        <br>
    `;

    try {
        products = []
        const snapshot = await firebase.firestore().collection(COLLECTION).get()
        snapshot.forEach(doc => {
            const { name, summary, price, image, image_url } = doc.data()
            const p = { docId: doc.id, name, summary, price, image, image_url }
            products.push(p)
        })
    } catch (e) {
        glPageContent.innerHTML = 'Firestore access error, try again later<br>' + e
        return
    }

    //console.log(products)

    if (products.length === 0) {
        glPageContent.innerHTML += `<h1> No products in the database</h1>`
        return
    }

    for (let index = 0; index < products.length; index++) {
        const p = products[index]
        if (!p) continue;
        glPageContent.innerHTML += `
        <div id = "${p.docId}" class="card" style="width: 18rem; display: inline-block">
            <img src="${p.image_url}" class="card-img-top">
            <div class="card-body">
                <h5 class="card-title">${p.name}</h5>
                <p class="card-text">${p.price}<br>${p.summary}</p>
                <button class="btn btn-primary" type="button" onclick="editProduct(${index})">Edit</button>
                <button class="btn btn-danger" type="button" onclick="deleteProduct(${index})">Delete</button>
            </div>
        </div>
        `;

    }
}

let cardOriginal
let imageFile2Update

function editProduct(index) {
    const p = products[index]
    const card = document.getElementById(p.docId)
    cardOriginal = card.innerHTML
    card.innerHTML = `
    <div class="form-group">
        Name: <input class="form-control" type="text" id="name" value="${p.name}" />
        <p id="name_error" style="color:red;" />
    </div>
    <div class="form-group">
        Summary: <br>
        <textarea class="form-control" id="summary" cols="40" rows="5">${p.summary}</textarea>
        <p id="summary_error" style="color:red;" />
    </div>
    <div class="form-group">
        Price: <input class="form-control" type="text" id="price" value="${p.price}" />
        <p id="price_error" style="color:red;" />
    </div>
    Current Image:<br>
    <img src="${p.image_url}"><br>
    <div class="form-group">
        New Image: <input type="file" id="imageButton" value="upload" />
    </div>
    <button class="btn btn-danger" type="button" onclick="update(${index})">Update</button>
    <button class="btn btn-secondary" type="button" onclick="cancel(${index})">Cancel</button>
    `;

    const imageButton = document.getElementById('imageButton')
    imageButton.addEventListener('change', e => {
        imageFile2Update = e.target.files[0]
    })
}

async function update(index) {
    const p = products[index]
    const newName = document.getElementById('name').value
    const newSummary = document.getElementById('summary').value
    const newPrice = document.getElementById('price').value

    const nameErrorTag = document.getElementById('name_error')
    const summaryErrorTag = document.getElementById('summary_error')
    const priceErrorTag = document.getElementById('price_error')
    nameErrorTag.innerHTML = validate_name(newName)
    summaryErrorTag.innerHTML = validate_summary(newSummary)
    priceErrorTag.innerHTML = validate_price(newPrice)

    if(nameErrorTag.innerHTML || summaryErrorTag.innerHTML || priceErrorTag.innerHTML) {
        return
    }

    let updated = false
    const newInfo = {}
    if (p.name !== newName) {
        newInfo.name = newName
        updated = true
    }
    if (p.summary !== newSummary) {
        newInfo.summary = newSummary 
        updated = true
    }
    if (p.price !== newPrice) {
        newInfo.price = Number(Number(newPrice).toFixed(2))
        updated = true
    }
    if (imageFile2Update) {
        updated = true
    }
    if (!updated) {
        cancel(index)
        return
    }

    //update DB
    try {
        if (imageFile2Update) {
            const imageRef2del = firebase.storage().ref().child(IMAGE_FOLDER + p.image)
            await imageRef2del.delete()
            
            const image = Date.now() + imageFile2Update.name
            const newImageRef = firebase.storage().ref(IMAGE_FOLDER + image)
            const taskSnapshot = await newImageRef.put(imageFile2Update)
            const image_url = await taskSnapshot.ref.getDownloadURL()
            newInfo.image = image
            newInfo.image_url = image_url
        }
        await firebase.firestore().collection(COLLECTION).doc(p.docId).update(newInfo)
        window.location.href = '/show'
    } catch (e) {
        glPageContent.innerHTML = 'Firestore/Storage update error <br>' + JSON.stringify(e)
    }
}

function cancel(index) {
    const p = products[index]
    const card = document.getElementById(p.docId)
    card.innerHTML = cardOriginal
}

async function deleteProduct(index) {
    try {
        const p = products[index]
        //delete (1) firestore doc, (2) storage image
        //console.log("await doc delete")
        await firebase.firestore().collection(COLLECTION).doc(p.docId).delete()
        const imageRef = firebase.storage().ref().child(IMAGE_FOLDER + p.image)
        //console.log("await image delete")
        await imageRef.delete()

        const card = document.getElementById(p.docId)
        card.parentNode.removeChild(card)

        delete products[index]
    } catch (e) {
        glPageContent.innerHTML = "Delete Error<br>" + JSON.stringify(e) 
    }
}