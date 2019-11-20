import express from 'express';
import connectDatabase from './config/db';
import { check, validationResult } from 'express-validator';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from 'config';
import User from './models/User';
import Post from './models/Post';
import auth from './middleware/auth';
//import { isError } from 'util';


//init express app
const app = express();

connectDatabase();

//configure middleware
app.use(express.json({ extended: false }));
app.use(
	cors({
			origin: 'http://localhost:3000'
	})
);

//api endpoints
/**
 * @route GET /
 * @desc Test endpoint
 */
app.get('/', (req, res) =>
	res.send('http get request sent to root api endpoint')
);

/**
 * @route Post api/users
 * @desc Register user
 */
app.post(
	'/api/users',
	[
		check('name', 'Please enter your name').not().isEmpty(),
		check('email', 'Please enter a valid email').isEmail(),
		check('password', 'Please enter a password with 6 or more characters').isLength({min: 6})
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		} else {
			const { name, email, password } = req.body;
			try{
				//check if user exists
				let user = await User.findOne({ email: email });
				if (user) {
					return res.status(400).json({errors: [{msg: 'User already exists'}] });
				}

				//new user
				user = new User({
					name: name,
					email: email,
					password: password
				});

				//password encryption
				const salt = await bcrypt.genSalt(10);
				user.password = await bcrypt.hash(password, salt);

				//save and return
				await user.save();

				//generate jwt token
				returnToken(user, res);
			} catch (error){
				res.status(500).send('Server error');
			}
		}
	}
);

/**
 * @route GET api/auth
 * @desc Authenticate user
 */
app.get('/api/auth', auth, async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		res.status(200).json(user);
	} catch (error) {
		res.status(500).send('Unknown server error');
	}
});

/**
 * @route POST api/login
 * @desc Login user
 */
app.post(
	'/api/login',
	[
		check('email', 'Please enter a valid email').isEmail(),
		check('password', 'A password is required').exists()
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ errors: errors.array() });
		} else {
			const { email, password } = req.body;
			try{
				//check if user exists
				let user = await User.findOne({ email: email });
				if (!user) {
					return res
						.status(400)
						.json({errors: [{ msg: 'Invalid email or password' }] });
				}

				//check password
				const match = await bcrypt.compare(password, user.password);
				if (!match) {
					return res
						.status(400)
						.json({ errors: [{ msg: 'Invalid email or password' }] });
				}

				//generate and return jwt token
				returnToken(user, res);
			} catch (error) {
				res.status(500).send('Server error');
			}
		}
	}
);

const returnToken = (user, res) => {
	const payload = {
		user: {
			id: user.id
		}
	};

	jwt.sign(
		payload,
		config.get('jwtSecret'),
		{ expiresIn: '10hr' },
		(err, token) => {
			if (err) throw err;
			res.json({ token: token });
		}
	);
};

//connection listener
const port = 5000;
app.listen(port, () => console.log(`Express server running on port ${port}`));

// Post endpoints
/**
 * @route POST api/posts
 * @desc Create post
 */
app.post(
	'/api/posts',
	[
		auth, 
		[
			check('title', 'Title text is required').not().isEmpty(),
			check('body', 'Body text is required').not().isEmpty()
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
		} else {
			const { title, body } = req.body;
			try {
				//get user who made post
				const user = await User.findById(req.user.id);

				//create new post
				const post = new Post({
					user: user.id,
					title: title,
					body: body
				});

				//save to db & return
				await post.save();

				res.json(post);
			} catch (error) {
				console.error(error);
				res.status(500).send('Server error');
			}
		}
	}
);

/**
 * @route GET api/posts
 * @desc get posts
 */
app.get('/api/posts', auth, async (req, res) => {
	try {
		const posts = await Post.find().sort({ date: -1 });

		res.json(posts);
	} catch (error) {
		console.error(error);
		res.status(500).send('Server error');
	}
});

/**
 * @route api/posts/:id
 * @desc get post
 */
app.get('/api/posts/:id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);

		//make sure post was found
		if (!post) {
			return res.status(404).json({ msg: 'Post not found' });
		}

		res.json(post);
	} catch (error) {
		console.error(error);
		res.status(500).send('Server error');
	}
});