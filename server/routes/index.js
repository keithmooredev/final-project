var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
var bcrypt = require('bcrypt-nodejs');
var randtoken = require('rand-token');
var stripe = require('stripe')(
	'pk_test_S1PLtt6vW1RchhitC9359CNc'
);

function sendReceipt(orderId, sendToAddress) {
	var transporter = nodemailer.createTransport({
		service: 'Yahoo',
		auth: {
			user: FROM_ADDRESS,
			pass: FROM_PASS
		}
	});

	var text = 'Your receipt for your recent order (#' + orderId + ')';
	var mailOptions = {
		from: FROM_ADDRESS,
		to: sendToAddress,
		subject: 'Email example',
		text: text
	}

	transporter.sendMail(mailOptions, function(err, info) {
		if (err) {
			throw err;
		} else {
			console.log('Message sent: ' + info.response);
		}
	});
}

// create a connection to the final-project database
var mysql = require('mysql');
var connection = mysql.createConnection({
	host: 'localhost',
	user: 'test',
	password: 'testPassword!!1',
	database: 'final-project'
});


// home route is for testing purposes only
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});


router.post('/checkToken', function(req, res, next) {
	if (req.body.token == undefined) {
		res.json({ failure: 'noToken' });
	} else {
		connection.query('SELECT * FROM `accounts` WHERE `token` = ?', [req.body.token],
			function(err, results, fields) {
				if (err) {
					throw err;
				} else if (results.length > 0) {
					res.json({ success: 'validated' });
				} else {
					res.json({ failure: 'badToken' });
				}
			});
	}
});


router.post('/getUsername', function(req, res, next) {

	if (req.body.token == undefined) {
		res.json({ failure: 'noToken' });
	} else {
		connection.query('SELECT `username` FROM `accounts` WHERE `token` = ?', [req.body.token],
			function(err, results, fields) {
				if (err) {
					throw err;
				} else if (results.length > 0) {
					res.json({ username: results[0] });
				} else {
					res.json({ failure: 'badToken' });
				}
			});
	}
});


router.get('/getLabServices', function(req, res, next) {

	connection.query('SELECT * FROM `services` ORDER BY `serviceType`', function(err, results, fields) {
		if (err) {
			throw err;
		} else {
			res.json({ results });
		}
	});
});


router.post('/register', function(req, res, next) {

	var salt = bcrypt.genSaltSync(10);
	var token = randtoken.generate(32);
	var newUser = {
		username: req.body.username,
		password: bcrypt.hashSync(req.body.password, salt),
		email: req.body.email,
		token: token
	}

	connection.query('SELECT * FROM `accounts` WHERE `username` = ?', [newUser.username],
		function(err, results, fields) {
			if (err) {
				throw err;
			} else if (results.length > 0) {
				res.json({ failure: 'notUnique' });
			} else {
				connection.query('INSERT INTO `accounts` SET ?', newUser, function(err, result) {
					if (err) {
						throw err;
					} else {
						res.json({
							success: 'added',
							token: token
						});
					}
				});
			}
		});
});


router.post('/login', function(req, res, next) {

	connection.query('SELECT * FROM `accounts` WHERE `username` = ?', [req.body.username],
		function(err, results, fields) {
			if (err) {
				throw err;
			} else if (results.length > 0) {
				var loginResult = bcrypt.compareSync(req.body.password, results[0].password);
				if (loginResult) {
					var token = randtoken.generate(32);
					connection.query('UPDATE `accounts` SET `token` = ? WHERE `username` = ?',
						[token, req.body.username], function(err, result) {
						if (err) {
							throw err;
						} else {
							res.json({
								success: 'match',
								token: token
							});
						}
					});
				} else {
					res.json({ failure: 'noMatch' });
				}
			} else {
				// if (!results)
				res.json({ failure: 'noUser' });
			}
		});
});


router.post('/submitSampleForm', function(req, res, next) {
	// when a sample submission form is posted, add the sample data/metadata to the database
	connection.query('INSERT INTO `orders` SET ?', req.body, function(err, result){
		if (err) {
			throw err;
		} else {
			res.json({ success: "added" });
		}
	});
});


router.post('/getOrderId', function(req, res, next) {
	connection.query('SELECT `id` FROM `orders` WHERE `token` = ? ORDER BY `timestamp` DESC', [req.body.token],
		function(err, results, fields) {
			if (err) {
				throw err;
			} else {
				if (results.length > 0) {
					res.json({ orderId: results[0].id });
				} else {
					res.json({ failure: 'problemGettingOrderId'});
				}
			}
		});
});


router.post('/getOrders', function(req, res, next) {
	connection.query('SELECT timestamp, orderType, orderData, orderStatus FROM `orders` WHERE `username` = ?', [req.body.username],
		function(err, results, fields) {
		if (err) {
			throw err;
		} else {
			res.json({ results });
		}
	})
});


router.post('/payment', function(req, res, next) {
	stripe.charges.create({
		amount: req.body.stripeAmount, // obtained with hidden input field
		currency: 'usd',
		source: req.body.stripeToken, // obtained with stripe
		description: "Charge for " + req.body.stripeEmail // obtained with hidden input field
	}, function(err, charge) {
		if (err && err.type === 'StripeCardError') {
			res.render('error', { message: 'There was a problem processing your Stripe payment.' });
		} else {
			connection.query('UPDATE `orders` SET `orderStatus` = ? WHERE `id` = ?',
				['paid', req.body.orderId], function(err, result) {
					if (err) {
						throw err;
					} else {
						sendReceipt(req.body.orderId, req.body.stripeEmail);
						res.render('index', {
							title: 'Success',
							body: 'Your order has been processed.'
						});
					}
			});
		}
	});
});

module.exports = router;
