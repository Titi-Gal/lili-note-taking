require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const cookieSession = require('cookie-session');
const models = require(__dirname + "/mongooseModels.js");
const User = models.User;
const Item = models.Item;
const Lili = models.Lili;

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: false}));
app.use(express.static("public"));

//passport cookies and login function
app.use(cookieSession({
    keys: [process.env.COOKIE_SECRET],
    })
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((_id, callback) => {
    callback(null, _id);
});

passport.deserializeUser((_id, callback) => {
    User.findById(_id).then((user) => {
        callback(null, user)
    });
});

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

//passport google strategy
passport.use( new GoogleStrategy({
    //options for strateg
    clientID: process.env.GOOGLE_ID,
    clientSecret:  process.env.GOOGLE_SECRET,
    callbackURL: '/auth/google/redirect',
    proxy: true
    }, (accessToken, refreshToken, profile, callback) => {
        findOrCreateUser(profile, callback)
    })
);
app.get('/auth/google', passport.authenticate('google', {scope: ['openid']}))
app.get('/auth/google/redirect', passport.authenticate('google'), (req, res) => {
    res.redirect('/')
});

//passport microsoft strategy
passport.use( new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_ID,
    clientSecret:  process.env.MICROSOFT_SECRET,
    callbackURL: '/auth/microsoft/redirect',
    proxy: true,
    scope: ['User.Read']
    }, (accessToken, refreshToken, profile, callback) => {
        findOrCreateUser(profile, callback)
    })
);
app.get('/auth/microsoft', passport.authenticate('microsoft', {prompt: 'select_account'}))
app.get('/auth/microsoft/redirect', passport.authenticate('microsoft'), (req, res) => {
    res.redirect('/')
});

//to aways redirect to https
if(process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https')
        res.redirect(`https://${req.header('host')}${req.url}`)
      else
        next()
    })
  }

//app view or connect
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        const currentid = req.user.currentid;
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
                limboItems: limboItems,
                liliid: liliid
            });
        });
    } else {
        //se não vai para conectar
        res.render('connect')
    }
});
app.get('/connect', (req, res) => {
    res.render('connect')
});

app.post('/setAsCurrentid', (req, res) => {
    User.findById(req.user._id).exec()
        .then((user) => {
            user.currentid = req.body.itemid;
            req.user.currentid = user.currentid;
            user.save()})
        .then(() => {
            res.redirect("/");
            });    
});

app.post('/createItem', (req, res) => {
    Item.create({
        liliid: req.user.liliid,
        parentid: req.user.currentid,
        text: req.body.itemtext
    }).catch((e) => {
    }).finally(() => {
        res.redirect("/")
    })
});

app.post('/updateItemText', (req, res) => {
    Item.findById(req.body.itemid).exec().then((item) => {
        item.text = req.body.itemtext;
        item.save().catch(e => {
        }).finally(() => {
            res.redirect("/")
        });
    });
});

app.post('/toLimbo', (req, res) => {
    Item.findById(req.body.itemid).exec().then((item) => {
        item.limbo = true;
        item.parentid = item.liliid;
        item.save().then(() => {
            res.redirect("/")
        });
    });
});

app.post('/fromLimbo', (req, res) => {
    Item.findById(req.body.itemid).exec().then((item) => {
        item.limbo = false;
        item.parentid = req.user.currentid;
        item.save().then(() => {
            res.redirect("/")
        });
    });
});

app.post('/deleteItem', (req, res) => {
    const itemid = req.body.itemid;
    const todelete = [itemid];
    recursiveFindChildren([itemid]).then(() => {
        Item.deleteMany({_id: {$in: todelete}}).then(() => {
            res.redirect("/")
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

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});