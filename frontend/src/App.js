"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = 'http://localhost:3000';
function App() {
    const [entityTypes, setEntityTypes] = (0, react_1.useState)([]);
    const [entities, setEntities] = (0, react_1.useState)([]);
    const [newEntityType, setNewEntityType] = (0, react_1.useState)({ id: '', name: '', predefinedAttributes: [] });
    const [newEntity, setNewEntity] = (0, react_1.useState)({ id: '', typeId: '', name: '', attributes: [], createdAt: new Date(), updatedAt: new Date(), ownerId: '' });
    (0, react_1.useEffect)(() => {
        fetchEntityTypes();
        fetchEntities();
    }, []);
    const fetchEntityTypes = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${API_BASE_URL}/entity-types`);
            setEntityTypes(response.data);
        }
        catch (error) {
            console.error('Error fetching entity types:', error);
        }
    });
    const fetchEntities = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get(`${API_BASE_URL}/entities`);
            setEntities(response.data);
        }
        catch (error) {
            console.error('Error fetching entities:', error);
        }
    });
    const handleAddEntityType = (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        try {
            yield axios_1.default.post(`${API_BASE_URL}/entity-types`, newEntityType);
            setNewEntityType({ id: '', name: '', predefinedAttributes: [] });
            fetchEntityTypes();
        }
        catch (error) {
            console.error('Error adding entity type:', error);
        }
    });
    const handleAddEntity = (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        try {
            yield axios_1.default.post(`${API_BASE_URL}/entities`, newEntity);
            setNewEntity({ id: '', typeId: '', name: '', attributes: [], createdAt: new Date(), updatedAt: new Date(), ownerId: '' });
            fetchEntities();
        }
        catch (error) {
            console.error('Error adding entity:', error);
        }
    });
    return (<div style={{ padding: '20px' }}>
      <h1>Central Ring UI</h1>

      <section>
        <h2>Add New Entity Type</h2>
        <form onSubmit={handleAddEntityType} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
          <input type="text" placeholder="ID (e.g., product)" value={newEntityType.id} onChange={(e) => setNewEntityType(Object.assign(Object.assign({}, newEntityType), { id: e.target.value }))} required/>
          <input type="text" placeholder="Name (e.g., Product)" value={newEntityType.name} onChange={(e) => setNewEntityType(Object.assign(Object.assign({}, newEntityType), { name: e.target.value }))} required/>
          {/* Simplified attribute input for now */}
          <textarea placeholder={"Predefined Attributes (JSON array, e.g., [{ \"name\": \"color\", \"type\": \"string\", \"required\": false, \"isUserDefined\": false }])"} value={JSON.stringify(newEntityType.predefinedAttributes)} onChange={(e) => {
            try {
                setNewEntityType(Object.assign(Object.assign({}, newEntityType), { predefinedAttributes: JSON.parse(e.target.value) }));
            }
            catch (error) {
                console.error("Invalid JSON for attributes", error);
            }
        }} rows={5} style={{ width: '100%' }}/>
          <button type="submit">Add Entity Type</button>
        </form>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2>Entity Types</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {entityTypes.map((type) => (<div key={type.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
              <h3>{type.name} ({type.id})</h3>
              <p>Attributes:</p>
              <ul>
                {type.predefinedAttributes.map((attr) => (<li key={attr.name}>{attr.name} ({attr.type}) {attr.required ? '(Required)' : ''}</li>))}
              </ul>
            </div>))}
        </div>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2>Add New Entity</h2>
        <form onSubmit={handleAddEntity} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
          <input type="text" placeholder="ID (e.g., entity-001)" value={newEntity.id} onChange={(e) => setNewEntity(Object.assign(Object.assign({}, newEntity), { id: e.target.value }))} required/>
          <input type="text" placeholder="Name (e.g., My First Product)" value={newEntity.name} onChange={(e) => setNewEntity(Object.assign(Object.assign({}, newEntity), { name: e.target.value }))} required/>
          <select value={newEntity.typeId} onChange={(e) => setNewEntity(Object.assign(Object.assign({}, newEntity), { typeId: e.target.value }))} required>
            <option value="">Select Entity Type</option>
            {entityTypes.map((type) => (<option key={type.id} value={type.id}>{type.name}</option>))}
          </select>
          <input type="text" placeholder="Owner ID" value={newEntity.ownerId} onChange={(e) => setNewEntity(Object.assign(Object.assign({}, newEntity), { ownerId: e.target.value }))} required/>
          {/* Simplified attribute input for now */}
          <textarea placeholder={"Attributes (JSON array, e.g., [{ \"name\": \"color\", \"value\": \"red\", \"isUserDefined\": true, \"type\": \"string\", \"required\": false, \"notApplicable\": false }])"} value={JSON.stringify(newEntity.attributes)} onChange={(e) => {
            try {
                setNewEntity(Object.assign(Object.assign({}, newEntity), { attributes: JSON.parse(e.target.value) }));
            }
            catch (error) {
                console.error("Invalid JSON for attributes", error);
            }
        }} rows={5} style={{ width: '100%' }}/>
          <button type="submit">Add Entity</button>
        </form>
      </section>

      <section style={{ marginTop: '40px' }}>
        <h2>Entities</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {entities.map((entity) => (<div key={entity.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
              <h3>{entity.name} (Type: {entity.typeId})</h3>
              <p>Owner: {entity.ownerId}</p>
              <p>Attributes:</p>
              <ul>
                {entity.attributes.map((attr) => (<li key={attr.name}>{attr.name}: {JSON.stringify(attr.value)} {attr.notApplicable ? '(N/A)' : ''}</li>))}
              </ul>
            </div>))}
        </div>
      </section>
    </div>);
}
exports.default = App;
