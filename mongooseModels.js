require('dotenv').config();
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

mongoose.connect('mongodb+srv://titi-gal:' + process.env.MONGO_PASSWORD  + '@cluster0.mre5gvd.mongodb.net/liliDB');

const liliSchema = new Schema({});

const itemSchema = new Schema(
    {
    liliid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        },
    parentid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        },
    text: {
        type: String,
        required: true,
        trim: true,
        },
    limbo: {
        type: Boolean,
        required: true,
        default: false,
        }
    }
)
const userSchema = new Schema(
    {
    connectid: String,
    liliid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        immutable: true,
        },
    currentid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        },
    }
)

itemSchema.index({parentid: 1, text: 1}, {unique: true });
itemSchema.statics.getParents = async function(currentid) {
    const parents = []
    let parent = await this.findById(currentid).exec();
    while (parent) {
        parents.push(parent)
        parent = await this.findById(parent.parentid).exec();
    }
    return parents.reverse();
}

itemSchema.statics.getCurrentItems = async function(currentid) {
    try {
        const currentItems = await this.find({parentid: currentid, limbo: false}).exec();
        return currentItems;
    } catch(e) {
        console.log(e);
    }
}
itemSchema.statics.getItems = async function(liliid) {
    try {
        const items = await this.find({liliid: liliid, limbo: false}).exec();
        return items;
    } catch(e) {
        console.log(e);
    }
}
itemSchema.statics.getLimboItems = async function(liliid) {
    try {
        const limboItems = await this.find({liliid: liliid, limbo: true}).exec();
        return limboItems;
    } catch(e) {
        console.log(e);
    }
}

module.exports.Lili = mongoose.model("lili", liliSchema);
module.exports.Item = mongoose.model("item", itemSchema);
module.exports.User = mongoose.model("user", userSchema);
module.exports.newRoot = async function newRoot(Item, User) {
    try {
        let user = await User.find({}).exec();
        if (user.length !== 0) {
            throw "user length !== 0, root already exists?"
        }
            const root = await new Item({
            });
            user = await new User({
            rootid: root._id,
            currentid: root._id
            });
            return Promise.all([
                root.save({ validateBeforeSave: false }),
                user.save()
            ])
    } catch(e) {
        console.log(e);
    }
}