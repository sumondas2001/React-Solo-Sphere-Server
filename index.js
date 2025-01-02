const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 8000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const cookieParser = require('cookie-parser')


const app = express();

const corsOptions = {
     origin: [
          'http://localhost:5173',
          'http://localhost:5174',

     ],
     credentials: true,
     optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

const verifyToken = (req, res, next) => {
     const token = req.cookies.token;
     console.log(token);
     if (!token) {
          return res.status(401).send({ message: 'unauthorized access' })
     };


     if (token) {
          jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
               if (error) {
                    return req.status(401).send({ message: 'Unauthorized access' })
               }
               else {
                    console.log(decode);
                    req.user = decode;
                    next()
               }

          })
     }

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3y9ux.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
     serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
     }
});

async function run() {
     try {
          const jobsCollection = client.db('soloSphere').collection('jobs');
          const bidsCollection = client.db('soloSphere').collection('bids');

          // jwt token generate
          app.post('/jwt', async (req, res) => {
               const user = req.body;
               const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: '365d'
               });
               res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strick'
               }).send({ success: true })
          })

          app.get('/logOut', (req, res) => {
               res.clearCookie('token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                    maxAge: 0
               })
                    .send({ success: true })
          })


          // Get all data from db
          app.get('/jobs', async (req, res) => {
               const result = await jobsCollection.find().toArray();
               console.log(result);
               res.send(result);
          });

          // Get a single data from db using job id

          app.get('/job/:id', async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) }
               const result = await jobsCollection.findOne(query);
               res.send(result);
          });

          // bit data post in db

          app.post('/bid', async (req, res) => {
               const data = req.body;

               const result = await bidsCollection.insertOne(data);
               res.send(result);
          });

          // add job post in db
          app.post('/addJob', async (req, res) => {
               const data = req.body;

               const result = await jobsCollection.insertOne(data);
               res.send(result)
          });
          // my posted job my email db data get

          app.get('/my-posted-job/:email', verifyToken, async (req, res) => {
               const verifyEmail = req.user.email;

               const email = req.params.email;
               if (verifyEmail !== email) {
                    return res.status(403).send({ message: 'forbidden access' })
               }
               const query = { 'buyer.buyer_email': email };
               const result = await jobsCollection.find(query).toArray();
               res.send(result)
          });
          // my bids job my email db data get

          app.get('/my-bids-job/:email', verifyToken, async (req, res) => {
               const verifyEmail = req.user.email;

               const email = req.params.email;
               if (verifyEmail !== email) {
                    return res.status(403).send({ message: 'forbidden access' })
               }
               const query = { email: email };
               const result = await bidsCollection.find(query).toArray();
               res.send(result)
          });

          //job delete for db

          app.delete('/jobDelete/:id', async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };

               const result = await jobsCollection.deleteOne(query)
               res.send(result);
          });

          // update for job

          app.put('/updateJob/:id', async (req, res) => {
               const id = req.params.id;
               console.log(id);
               const data = req.body;

               const query = { _id: new ObjectId(id) };
               const options = { upsert: true };

               const updateDoc = {
                    $set: {
                         ...data
                    }
               };

               const result = await jobsCollection.updateOne(query, updateDoc, options);
               res.send(result)

          });




          // bid-Requests data for db
          app.get('/bids-Requests/:email', verifyToken, async (req, res) => {
               const verifyEmail = req.user.email;

               const email = req.params.email;
               if (verifyEmail !== email) {
                    return res.status(403).send({ message: 'forbidden access' })
               }
               const query = { 'buyer.buyer_email': email };
               const result = await bidsCollection.find(query).toArray();
               res.send(result);
          });


          app.patch('/bid-update/:id', async (req, res) => {
               const id = req.params.id;
               const data = req.body;
               const query = { _id: new ObjectId(id) };

               const updateDoc = {
                    $set: {
                         ...data
                    }
               };
               const result = await bidsCollection.updateOne(query, updateDoc);
               res.send(result);
          })

          // Send a ping to confirm a successful connection
          await client.db("admin").command({ ping: 1 });
          console.log("Pinged your deployment. You successfully connected to MongoDB!");
     } finally {
          // Ensures that the client will close when you finish/error 

     }
}
run().catch(console.dir);

app.get('/', (req, res) => {
     res.send('Hello From react solo sphere server');
});


app.listen(port, () => {
     console.log(`Example app listening on port ${port}`);
});