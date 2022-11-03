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
        //se não vai para conectar
        res.render('connect')
    }
});

app.get('/connect', (req, res) => {
    res.render('connect')
});

//Lili routes
app.get('/view', (req, res) => {
    if (req.isAuthenticated()) {
        const currentid = req.query.id;
        const liliid = req.user.liliid;
        Promise.all([
            Item.getParents(liliid, currentid),
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
    } else {
        res.redirect('/');
    }
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
    }).catch((e) => {
        console.log(e);
    }).finally(() => {
        res.redirect("/view?id=" + req.user.currentid)
    })
});

app.post('/updateItemText', (req, res) => {
    Item.findById(req.body.itemid).exec().then((item) => {
        item.text = req.body.itemtext;
        item.save().catch(e => {
            console.log(e);
        }).finally(() => {
            res.redirect("/view?id=" + req.user.currentid)
        });
    });
});

app.post('/toLimbo', (req, res) => {
    Item.findById(req.body.itemid).exec().then((item) => {
        item.limbo = true;
        item.save().then(() => {
            res.redirect("/view?id=" + req.user.currentid)
        });
    });
});

app.post('/fromLimbo', (req, res) => {
    Item.findById(req.body.itemid).exec().then((item) => {
        item.limbo = false;
        item.parentid = req.user.currentid;
        item.save().then(() => {
            res.redirect("/view?id=" + req.user.currentid)
        });
    });
});

app.post('/deleteItem', (req, res) => {
    const itemid = req.body.itemid;
    const todelete = [itemid];
    recursiveFindChildren([itemid]).then(() => {
        Item.deleteMany({_id: {$in: todelete}}).then(() => {
            res.redirect("/view?id=" + req.user.currentid)
        })
    })
    async function recursiveFindChildren(childrenids) {
        for (let i = 0; i < childrenids.length; i++) {
            const newChildrenids = await Item.find({parentid: childrenids[i]}).distinct('_id');
            if (newChildrenids.length !== 0) {
                todelete.push.apply(todelete, newChildrenids)
                await recursiveFindChildren(newChildrenids)
            }
        }
    }
});

const port = 3000
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});