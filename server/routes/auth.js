const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const ROUTE_CONFIG = require('../config/route-config');

const resourcePath = path.join(__dirname, '../resource');

const MongoClient = require('mongodb').MongoClient;
const DB_CONFIG = require('../config/database-config');

var users;

// Database connection
MongoClient.connect(DB_CONFIG.PATH, { useUnifiedTopology: true }, (err, db) => {
    if (err) throw err;

    const dbo = db.db(DB_CONFIG.NAME); // Database object

    users = dbo.collection(DB_CONFIG.COLLECTIONS.USERS);
});

// login request
router.post('/login', (req, res) => {
    const payload = {
        username: req.body.username.toLowerCase(),
        password: req.body.password
    };

    users.findOne({ username: payload.username, password: payload.password }, (err, user) => {

        if (user) {
            // Generate jwt token
            const token = jwt.sign(payload, ROUTE_CONFIG.JWT_SECRET_CONFIG, { expiresIn: '1d' });

            return res.json({ success: true, data: user, token: token });
        } else {
            return res.json(
                { success: false, message: 'UserName or Password is incorrect. Please enter valid username or password' }
            );
        }

    });
});

// signup request
router.post('/signup', (req, res) => {

    isUserExist(req.body.username, function () {
        if (this.isExist) {
            return res.json(
                { success: false, message: 'Username already exist, Please try again with new one' }
            );
        } else {
            const newUser = {
                username: req.body.username.toLowerCase(), password: req.body.password, role: 'end-user'
            };

            users.insertOne(newUser, (err, result) => {
                if (result) {
                    return res.json({ success: true });
                } else {
                    return res.json(
                        { success: false, message: 'Something went wrong, Please try again later' }
                    );
                }
            });
        }
    });
});

/**
 * Check the entered user is already exist or not
 */
function isUserExist(username, callback) {
    users.findOne({ username: username.toLowerCase() }, (err, user) => {
        callback.apply({ isExist: !!user });
    });
}

/* GET api listing. */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

module.exports = router;
