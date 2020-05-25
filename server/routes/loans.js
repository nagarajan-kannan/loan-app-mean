const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const ROUTE_CONFIG = require('../config/route-config');

const resourcePath = path.join(__dirname, '../resource');

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const DB_CONFIG = require('../config/database-config');

const safeObjectId = s => ObjectId.isValid(s) ? new ObjectId(s) : null;

var users, loanDetails;

// Database connection
MongoClient.connect(DB_CONFIG.PATH, { useUnifiedTopology: true }, (err, db) => {
    if (err) throw err;

    const dbo = db.db(DB_CONFIG.NAME); // Database object

    users = dbo.collection(DB_CONFIG.COLLECTIONS.USERS);
    loanDetails = dbo.collection(DB_CONFIG.COLLECTIONS.LOAN_DETAILS);
});

// Get request with token
router.get('/loan-list/:username', (req, res) => {
    const token = req.headers['authorization'];

    if (token) {
        jwt.verify(token, ROUTE_CONFIG.JWT_SECRET_CONFIG, (err, decoded) => {
            if (err) {
                return res.json({ success: false, message: 'Invalid token key' });
            } else {
                const username = req.params.username;

                getUserRole(username, function () {

                    loanDetails.find({}).toArray((err, loans) => {
                        // loans which is assinged to the logged in relation manager
                        if (this.role === 'rel-manager') {
                            loans = loans.filter(t => t.assignedTo === username);
                        }

                        // loans which is created by logged in user
                        if (this.role === 'end-user') {
                            loans = loans.filter(t => t.createdBy === username);
                        }

                        return res.json({ success: true, data: loans, message: 'Verified' });
                    });
                });
            }
        });
    } else {
        return res.status(403).send({ success: false, message: 'No token provided' });
    }

});

// Save new loan request
router.post('/new-loan', (req, res) => {
    const token = req.headers['authorization'];

    if (token) {
        jwt.verify(token, ROUTE_CONFIG.JWT_SECRET_CONFIG, (err, decoded) => {
            if (err) {
                return res.json({ success: false, message: 'Invalid token key' });
            } else {

                const newLoan = req.body;

                getFreeRelManager(function () {
                    newLoan.assignedTo = this.relManager;
                    newLoan.loanStatus = 'Pending';
                    newLoan.managerApproval = 'Pending';

                    loanDetails.insertOne(newLoan, (err, result) => {
                        if (result) {
                            return res.json({ success: true, message: 'Verified' });
                        } else {
                            return res.json(
                                { success: false, message: 'Something went wrong, Please try again later' }
                            );
                        }
                    });
                });
            }
        });
    } else {
        return res.status(403).send({ success: false, message: 'No token provided' });
    }
});

// update the loan request
router.post('/update-loan', (req, res) => {
    const token = req.headers['authorization'];

    if (token) {
        jwt.verify(token, ROUTE_CONFIG.JWT_SECRET_CONFIG, (err, decoded) => {
            if (err) {
                return res.json({ success: false, message: 'Invalid token key' });
            } else {
                loanDetails.updateOne({ _id: safeObjectId(req.body._id) },
                    {
                        $set: {
                            loanStatus: req.body.loanStatus,
                            managerApproval: req.body.managerApproval
                        }
                    }, (err, result) => {
                        if (result) {
                            return res.json({ success: true, message: 'Verified' });
                        } else {
                            return res.json(
                                { success: false, message: 'Something went wrong, Please try again later' }
                            );
                        }
                    });
            }
        });
    } else {
        return res.status(403).send({ success: false, message: 'No token provided' });
    }
});

/**
 * Check the entered user is already exist or not
 */
function getUserRole(username, callback) {
    users.findOne({ username: username.toLowerCase() }, (err, user) => {
        callback.apply({ role: user && user.role });
    });
}

/**
 * Get the relation manager who needs to be assign this time 
 */
function getFreeRelManager(callback) {
    loanDetails.find({}).toArray((err, loans) => {
        const lastAssigned = loans.length && loans[loans.length - 1].assignedTo;

        let index = lastAssigned ? Number(lastAssigned[lastAssigned.length - 1]) + 1 : 1;
        index = (index <= 4) ? index : 1;

        callback.apply({ relManager: `rel-manager${index}` });
    });
}

/* GET api listing. */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

module.exports = router;
