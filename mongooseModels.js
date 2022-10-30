const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const itemSchema = new Schema(
    {
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
const adressSchema = new Schema(
    {
    rootid: {
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
itemSchema.statics.createItem = async function(text, currentid) {
    try {
    await this.create({
        parentid: currentid,
        text: text,
    });
    } catch(e) {
        console.log(e);
    }
}
itemSchema.statics.getCurrentParent = async function(currentid) {
    try {
        const parentItem = await this.findById(currentid).exec();
        return parentItem;
    } catch(e) {
        console.log(e);
    }
}
itemSchema.statics.getCurrentItems = async function(currentid) {
    try {
        const currentItems = await this.find({parentid: currentid, limbo: false}).exec();
        return currentItems;
    } catch(e) {
        console.log(e);
    }
}
itemSchema.statics.getItems = async function() {
    try {
        const limboItems = await this.find({limbo: false}).exec();
        return limboItems;
    } catch(e) {
        console.log(e);
    }
}
itemSchema.statics.getLimboItems = async function() {
    try {
        const limboItems = await this.find({limbo: true}).exec();
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
    let parent = await this.getCurrentParent(currentid);
    while (parent.parentid !== undefined) {
        parents.push(parent)
        parent = await this.getCurrentParent(parent.parentid);
    }
    return parents.reverse();
}

adressSchema.statics.getRootid = async function() {
    try {
        const adress = await this.findOne({}).exec();
        return adress.rootid;
    } catch(e) {
        console.log(e);
    }
}
adressSchema.statics.getCurrentid = async function() {
    try {
        const adress = await this.findOne({}).exec();
        return adress.currentid;
    } catch(e) {
        console.log(e);
    }
}
adressSchema.statics.setCurrentid = async function(itemid) {
    try {
        if (itemid === '') {
            throw 'id to set empty, already in root?'
        }
        const adress = await this.findOne({}).exec();
        adress.currentid = itemid;
        await adress.save();
    } catch(e) {
        console.log(e);
    }
    
}

module.exports.Item = mongoose.model("Item", itemSchema);
module.exports.Adress = mongoose.model("Adress", adressSchema);
module.exports.createRoot = async function createRoot(Item, Adress) {
    try {
        let adress = await Adress.find({}).exec();
        if (adress.length !== 0) {
            throw "adress length !== 0, root already exists?"
        }
            const root = await new Item({
            });
                adress = await new Adress({
                rootid: root._id,
                currentid: root._id
            });
            return Promise.all([
                root.save({ validateBeforeSave: false }),
                adress.save()
            ])
    } catch(e) {
        console.log(e);
    }
}