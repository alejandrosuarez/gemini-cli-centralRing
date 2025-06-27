"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Central Ring API is running!');
});
// Basic in-memory storage for demonstration
const entityTypes = [];
const entities = [];
// Routes for EntityType management
app.post('/entity-types', (req, res) => {
    const newEntityType = req.body;
    console.log('Received new entity type:', newEntityType.name);
    entityTypes.push(newEntityType);
    res.status(201).send(newEntityType);
});
app.get('/entity-types', (req, res) => {
    console.log('Fetching all entity types.');
    res.send(entityTypes);
});
// Routes for Entity management
app.post('/entities', (req, res) => {
    const newEntity = req.body;
    console.log('Received new entity:', newEntity.name);
    entities.push(newEntity);
    res.status(201).send(newEntity);
});
app.get('/entities', (req, res) => {
    console.log('Fetching all entities.');
    res.send(entities);
});
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
