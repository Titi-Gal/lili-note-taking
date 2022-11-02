const mongoose = require("mongoose");
const Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost:27017/liliDB');

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
        const limboItems = await this.find({liliid: liliid, limbo: false}).exec();
        return limboItems;
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
itemSchema.statics.updateItemText = async function(itemtext, itemid) {
    try {
        const item = await this.findById(itemid).exec();
        item.text = itemtext;
        await item.save();
    } catch(e) {
        console.log(e);
    }
}
itemSchema.statics.toLimbo = async function(itemid) {
    try {
        const item = await this.findById(itemid).exec();
        item.limbo = true;
        await item.save();
    } catch(e) {
        console.log(e);
    }
}
itemSchema.statics.fromLimbo = async function(itemid, currentid) {
    try {
        const item = await this.findById(itemid).exec();
        item.limbo = false;
        item.parentid = currentid;
        await item.save();
    } catch(e) {
        console.log(e);
    }
}
itemSchema.statics.deleteItem = async function(itemid) {
    const todelete = [itemid]
    const Item = this;
    async function recursiveFindChildren(childrenids) {
        for (let i = 0; i < childrenids.length; i++) {
            const newChildrenids = await Item.find({parentid: childrenids[i]}).distinct('_id');
            if (newChildrenids.length !== 0) {
                todelete.push.apply(todelete, newChildrenids)
                await recursiveFindChildren(newChildrenids)
            }
        }
    }
    try {
    await recursiveFindChildren([itemid]);
    const deletecount = await Item.deleteMany({_id: {$in: todelete}});
    } catch(e) {
        console.log(e);
    }
}
itemSchema.statics.getParents = async function createRoot(currentid) {
    const parents = []
    let parent = await this.findById(currentid).exec();
    while (parent) {
        parents.push(parent)
        parent = await this.findById(parent.parentid).exec();
    }
    return parents.reverse();
}

userSchema.statics.getRootid = async function() {
    try {
        const user = await this.findOne({}).exec();
        return user.rootid;
    } catch(e) {
        console.log(e);
    }
}
userSchema.statics.getCurrentid = async function() {
    try {
        const user = await this.findOne({}).exec();
        return user.currentid;
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