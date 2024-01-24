const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// jwt verify function
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unAuthorized access" });
  }
  // berar token
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unAuthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hi7rjxl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


async function run() {
  try {
    await client.connect();
    const userCollection = client.db("house-rant-server").collection("users");
    const HouseRantCollection = client
      .db("house-rant-server")
      .collection("house-rant-data");

    // Register User
    app.post("/register", async (req, res) => {
      try {
        const { fullName, role, phoneNumber, email, password } = req.body;

        // already exists in the database
        const existingUser = await userCollection.findOne({ email });

        if (existingUser) {
          return res.status(400).json({ error: "User already exists" });
        }

        // Hash the password for security
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user object with hashed password
        const newUser = {
          fullName,
          role,
          phoneNumber,
          email,
          password: hashedPassword,
        };

        // Insert the new user into the database
        await userCollection.insertOne(newUser);

        const token = jwt.sign(
          { email, role },
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: "1d",
          }
        );
        res
          .status(201)
          .json({
            accessToken: token,
            message: "User registered successfully",
          });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Login Route
 app.post("/login", async (req, res) => {
   try {
     const { email, password } = req.body;

     // Find the user by email
     const user = await userCollection.findOne({ email });

     if (!user) {
       return res.status(401).json({ error: "Invalid email or password" });
     }

     // Check the password
     const passwordMatch = await bcrypt.compare(password, user.password);

     if (!passwordMatch) {
       return res.status(401).json({ error: "Invalid email or password" });
     }

     // Generate JWT token
     const token = jwt.sign(
       { userId: user._id, email: user.email },
       process.env.ACCESS_TOKEN_SECRET,
       {
         expiresIn: "1d",
       }
     );

     res.status(200).json({ accessToken: token });
   } catch (error) {
     console.error(error);
     res.status(500).json({ error: "Internal server error" });
   }
 });
    app.post("/getUser", verifyToken, async (req, res) => {
      try {
        const { email } = req.decoded;
        const user = await userCollection.findOne({ email });
        res.send(user);
      } catch (err) {
        next(err);
        res.send({ message: "user not logged yet" });
      }
    });
    // get user data
    app.get("/userData", async (req, res) => {
      const result = await userCollection.find().toArray();

      res.send(result);
    });
    app.post("/houseRant", async (req, res) => {
      const houseData = req.body;
      const result = await HouseRantCollection.insertOne(houseData);
      res.send(result);
    });

    app.get("/getHouseData", async (req, res) => {
      const result = await HouseRantCollection.find().toArray();
      res.send(result);
    });
    // delete house data house owner page
    app.delete("/houseDelete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await HouseRantCollection.deleteOne(query);
      res.send(result);
    });

    //     update House data from my Owner page
    app.put("/updateHouse/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      //   const updateItem = {
      //     $set: {
      //       price: body.price,
      //       quantity: body.quantity,
      //       description: body.description,
      //     },
      //   };
      const result = await allToyCollection.updateOne(filter, body, options);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("House Rant Running Soon");
});

app.listen(port, () => {
  console.log(`House Rant server is running port ${port}`);
});
