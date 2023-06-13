const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


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
    await client.connect();

    const database = client.db("dailyFitDB");
    const userCollection = database.collection("users");
    const classCollection = database.collection("classes");
    const instructorCollection = database.collection("instructors");
    // const reviewCollection = database.collection("reviews");
    // const cartCollection = database.collection("carts");


    // user(students,instructors, admin) related apis
    app.get('/users', async(req, res) => {
      const result = await userCollection.find().toArray();
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

/*     app.get('/users/admin/:email', async(req, res) => {
      const email = req.params.email;
      if(req.decoded.email !== email) {
        return res.send({ admin: false })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin : user?.role === 'admin' }
      res.send(result);
    }) */
    
    // classes related apis
    app.get('/classes', async(req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });
    // classes related apis
    app.get('/instructors', async(req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    });


/*     // cart related apis
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
    }); */

/*     app.post('/carts', async(req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    }); */

/*     app.delete('/carts/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    }); */

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