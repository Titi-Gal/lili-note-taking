require('dotenv').config();
const express = require('express');
const passport = require('passport');
const cookieSession = require('cookie-session');
const GoogleStrategy = require('passport-google-oauth20');
const models = require(__dirname + "/mongooseModels.js");
const User = models.User;
const Item = models.Item;
const Lili = models.Lili;

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: false}));
app.use(express.static("public"));

//passport, cookieSession and related routes
app.use(cookieSession({
    keys: [process.env.COOKIE_SECRET],
    })
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((_id, callback) => {
    console.log('serialize')
    callback(null, _id);
});

passport.deserializeUser((_id, callback) => {
    console.log('deserialize');
    User.findById(_id).then((user) => {
        callback(null, user)
    });
});

passport.use( new GoogleStrategy({
    //options for strateg
    clientID: process.env.CLIENT_ID,
    clientSecret:  process.env.CLIENT_SECRET,
    callbackURL: '/auth/google/redirect'
    }, (accessToken, refreshToken, profile, callback) => {
        findOrCreateUser(profile, callback)
    })
);

async function findOrCreateUser(profile, callback) {
    let user = await User.findOne({connectid: profile.id});
    if (user) {
        callback(null, user._id);
    } else {
        const lili = await Lili.create({});
        const user = await User.create({
            connectid: profile.id,
            liliid: lili._id,
            currentid: lili._id             
        });
        callback(null, user._id);
    }
}

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/')
});

app.get('/auth/google', passport.authenticate('google', {scope: ['openid']}))

app.get('/auth/google/redirect', passport.authenticate('google'), (req, res) => {
    res.redirect('/')
});

//
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        //se autenticado vai para a lista
        res.redirect("/view?id=" + req.user.currentid);
    } else {
        res.redirect('/connect')
    }
});

app.get('/connect', (req, res) => {
    res.render('connect')
});

//Lili routes
app.get('/view', (req, res) => {
    const currentid = req.query.id;
    const liliid = req.user.liliid;
    Promise.all([
        Item.getParents(currentid),
        Item.getCurrentItems(currentid),
        Item.getItems(liliid),
        Item.getLimboItems(liliid),
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
    User.findById(req.user._id).exec()
        .then((user) => {
            user.currentid = req.body.itemid;
            req.user.currentid = user.currentid;
            user.save()})
        .then(() => {
            res.redirect("/view?id=" + req.user.currentid);
            });    
});

app.post('/createItem', (req, res) => {
    Item.create({
        liliid: req.user.liliid,
        parentid: req.user.currentid,
        text: req.body.itemtext
    }).then(() => {
        res.redirect("/view?id=" + req.user.currentid)
    });
});

app.post('/updateItemText', (req, res) => {
    const itemid = req.body.itemid;
    const itemtext = req.body.itemtext;
    async function updateItemText() {
        const currentid = await User.getCurrentid();
        await Item.updateItemText(itemtext, itemid);
        res.redirect("/view?id=" + currentid)
    } updateItemText();
});

app.post('/toLimbo', (req, res) => {
    const itemid = req.body.itemid;
    async function toLimbo() {
        const currentid = await User.getCurrentid();
        await Item.toLimbo(itemid);
        res.redirect("/view?id=" + currentid)
    } toLimbo();    
});

app.post('/fromLimbo', (req, res) => {
    const itemid = req.body.itemid;
    async function fromLimbo() {
        const currentid = await User.getCurrentid();
        await Item.fromLimbo(itemid, currentid);
        res.redirect("/view?id=" + currentid);
    } fromLimbo(); 
});

app.post('/deleteItem', (req, res) => {
    const itemid = req.body.itemid;
    async function deleteItem() {
        const currentid = await User.getCurrentid();
        await Item.deleteItem(itemid);
        res.redirect("/view?id=" + currentid);
    } deleteItem(); 
});

const port = 3000
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});