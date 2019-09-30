import express from 'express';
import connectDatabase from './config/db';

//init express app
const app = express();

connectDatabase();

//configure middleware
app.use(express.json({ extended: false }));

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
app.post('/api/users', (req, res) => {
    console.log(req.body);
    res.send(req.body);
});

//connection listener
app.listen(3000, () => console.log('Express server running on port 3000'));

