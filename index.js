require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const models = require(__dirname + "/mongooseModels.js");
const Adress = models.Adress;
const Item = models.Item;
const createRoot = models.createRoot;

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect('mongodb://localhost:27017/MyliliDB');

app.get('/connect', (req, res) => {
    res.render('connect')
});

app.get('/', (req, res) => {
    async function createRootRedirect() {
        await createRoot(Item, Adress);
        const currentid = await Adress.getCurrentid();
        res.redirect("/view?id=" + currentid)
    } createRootRedirect();
});

app.get('/view', (req, res) => {
    let currentid = req.query.id;
    Promise.all([
        Item.getParents(currentid),
        Item.getCurrentItems(currentid),
        Item.getItems(),
        Item.getLimboItems(),
    ]).then((variables) => {
        const [parents, currentItems, items, limboItems] = variables;
        res.render("lili", {
            parents: parents,
            currentItems: currentItems,
            items: items,
            limboItems: limboItems
        });
    });
});

app.post('/setAsCurrentid', (req, res) => {
    const itemid = req.body.itemid;
    async function setAsCurrentid() {
        await Adress.setCurrentid(itemid);
        const currentid = await Adress.getCurrentid();
        res.redirect("/view?id=" + currentid);
    } setAsCurrentid();
});

app.post('/createItem', (req, res) => {
    const itemtext = req.body.itemtext;
    async function createItem() {
        const currentid = await Adress.getCurrentid();
        await Item.createItem(itemtext, currentid);
        res.redirect("/view?id=" + currentid);
    } createItem();
});

app.post('/updateItemText', (req, res) => {
    console.log(req);
    const itemid = req.body.itemid;
    const itemtext = req.body.itemtext;
    async function updateItemText() {
        const currentid = await Adress.getCurrentid();
        await Item.updateItemText(itemtext, itemid);
        res.redirect("/view?id=" + currentid)
    } updateItemText();
});

app.post('/toLimbo', (req, res) => {
    const itemid = req.body.itemid;
    async function toLimbo() {
        const currentid = await Adress.getCurrentid();
        await Item.toLimbo(itemid);
        res.redirect("/view?id=" + currentid)
    } toLimbo();    
});

app.post('/fromLimbo', (req, res) => {
    const itemid = req.body.itemid;
    async function fromLimbo() {
        const currentid = await Adress.getCurrentid();
        await Item.fromLimbo(itemid, currentid);
        res.redirect("/view?id=" + currentid);
    } fromLimbo(); 
});

app.post('/deleteItem', (req, res) => {
    const itemid = req.body.itemid;
    async function deleteItem() {
        const currentid = await Adress.getCurrentid();
        await Item.deleteItem(itemid);
        res.redirect("/view?id=" + currentid);
    } deleteItem(); 
});

const port = 3000
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});