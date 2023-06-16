const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized access'});
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, decoded) => {
    if(err) {
      return res.status(401).send({ error: true, message: 'Unauthorized access'});
    }
    req.decoded = decoded;
    next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_SECRET}@cluster0.28gkq0d.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const database = client.db("dailyFitDB");
    const userCollection = database.collection("users");
    const classCollection = database.collection("classes");
    const cartCollection = database.collection("carts");
    const paymentCollection = database.collection("payments");
    const reviewCollection = database.collection("reviews");

    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign( user , process.env.ACCESS_SECRET_KEY, { expiresIn: '1d'} );
      res.send(token);
    })

    // Warning: user verifyJWT before using verifyAdminInstructor
    const verifyAdminInstructor = async(req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if(user?.role !== 'admin' && 'instructor') {
        return res.status(403).send({error: true, message: 'Forbidden message'})
      }
      next();
    }


    // user(students,instructors, admin) related apis
    app.get('/users', verifyJWT, verifyAdminInstructor, async(req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // specific role: instructor api
    app.get('/users/instructor', async(req, res) => {
      const query = { role: 'instructor' }
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', verifyJWT, async(req, res) => {
      const email = req.params.email;
      if(req.decoded.email !== email) {
        return res.send({ admin: false })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin : user?.role === 'admin' }
      res.send(result);
    });

    app.get('/users/instructor/:email', verifyJWT, async(req, res) => {
      const email = req.params.email;
      if(req.decoded.email !== email) {
        return res.send({ instructor: false })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor : user?.role === 'instructor' }
      res.send(result);
    });

    app.post('/users', async(req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if(existingUser) {
        return res.send({ message: 'User already exists' });
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    });

    app.patch('/users/admin/:id', async(req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch('/users/instructor/:id', async(req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    
    app.delete('/users/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });


    // classes related apis
    app.get('/classes', async(req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    // status: approved api
    app.get('/classes/approved', async(req, res) => {
      const query = { status: 'approved' }
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/classes/:email', verifyJWT, async(req, res) => {
      const email = req.params.email;
      if(!email) {
        res.send([])
      }
      const query = { email: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/classes', async(req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    app.patch('/classes/approved/:id', async(req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'approved'
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch('/classes/denied/:id', async(req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'denied'
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.put('/classes/:id', async(req, res) => {
      const id = req.params.id;
      const feedback = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          feedback: feedback.message
        },
      };
      const result = await classCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    app.delete('/classes/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(query);
      res.send(result);
    });

    // carts related apis
    app.get('/carts', verifyJWT, async(req, res) => {
      const email = req.query.email;
      if(!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email
      if(email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden access'});
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async(req, res) => {
      const program = req.body;
      const result = await cartCollection.insertOne(program);
      res.send(result);
    });

    app.delete('/carts/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });


    // review related apis
    app.get('/reviews', async(req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });


    // create payment intent
    app.post('/create-payment-intent', verifyJWT, async(req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    });


    // payment related apis
    app.post('/payments', verifyJWT, async(req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

    
      res.send( insertResult );
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Daily Fit Server is Running...')
})

app.listen(port, () => {
    console.log(`Daily Fit server is running on port ${port}`);
})