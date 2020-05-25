const DB_CONFIG = {
    PATH: 'mongodb://127.0.0.1:27017/',
    NAME: 'dbloan',
    COLLECTIONS: {
        USERS: 'users',
        LOAN_DETAILS: 'loan-details'
    }
};

module.exports = DB_CONFIG;
