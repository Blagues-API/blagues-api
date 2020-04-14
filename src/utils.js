const random = (items) => {
    return items[Math.floor(Math.random() * items.length)];
};

const generateAPIToken = (jwt, user_id, limit) => {
    return jwt.sign({
        user_id,
        limit,
    }, process.env.jwt_encryption_web);
};


module.exports = {
    generateAPIToken,
    random,
};