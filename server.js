const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected"));

const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: String
}));

// const Task = mongoose.model('Task', new mongoose.Schema({
//     userId: mongoose.Schema.Types.ObjectId,
//     title: String,
//     description: String,
//     priority: { type: String, default: 'Medium' },
//     completed: { type: Boolean, default: false },
//     createdAt: { type: Date, default: Date.now }
// }));
// ... (previous imports and auth middleware remains same)

const Task = mongoose.model('Task', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    title: String,
    description: String,
    remarks: String, // New field for pointers/notes
    priority: { type: String, default: 'Medium' },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}));

const auth = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: "Access Denied" });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) { res.status(400).json({ error: "Invalid Token" }); }
};
// ... (API Routes)
// Ensure the PATCH route is robust for updates
app.patch('/api/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id }, 
            { $set: req.body }, 
            { new: true }
        );
        res.json(task);
    } catch (e) { res.status(400).json({ error: "Update failed" }); }
});
// ... rest of server code


app.post('/api/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ ...req.body, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: "Registered" });
    } catch (e) { res.status(400).json({ error: "Email already taken" }); }
});

app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) 
        return res.status(400).json({ error: "Invalid Credentials" });
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
});

app.get('/api/tasks', auth, async (req, res) => {
    const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
});

app.post('/api/tasks', auth, async (req, res) => {
    const task = new Task({ ...req.body, userId: req.user._id });
    await task.save();
    res.json(task);
});

app.patch('/api/tasks/:id', auth, async (req, res) => {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true });
    res.json(task);
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
    await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));