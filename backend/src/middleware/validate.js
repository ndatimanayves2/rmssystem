const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
  next();
};

const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow('', null),
    password: Joi.string().min(8).required(),
    role_id: Joi.number().integer().required(),
    facility_id: Joi.string().uuid().allow(null, ''),
  }),

  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(8).required(),
  }),

  createRequest: Joi.object({
    approving_facility_id: Joi.string().uuid().required(),
    priority: Joi.string().valid('NORMAL', 'HIGH', 'EMERGENCY').default('NORMAL'),
    notes: Joi.string().allow('', null),
    items: Joi.array().items(Joi.object({
      medicine_id: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).required(),
      unit_price: Joi.number().min(0).default(0),
    })).min(1).required(),
  }),

  createPO: Joi.object({
    supplier_id: Joi.string().uuid().required(),
    expected_delivery: Joi.string().isoDate().allow(null, ''),
    notes: Joi.string().allow('', null),
    items: Joi.array().items(Joi.object({
      medicine_id: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).required(),
      unit_price: Joi.number().min(0).required(),
    })).min(1).required(),
  }),

  createPOFromRequest: Joi.object({
    supplier_id: Joi.string().uuid().required(),
    expected_delivery: Joi.string().isoDate().allow(null, ''),
    notes: Joi.string().allow('', null),
  }),

  addBatch: Joi.object({
    medicine_id: Joi.string().uuid().required(),
    facility_id: Joi.string().uuid().required(),
    batch_number: Joi.string().required(),
    lot_number: Joi.string().allow('', null),
    quantity: Joi.number().integer().min(1).required(),
    manufacturing_date: Joi.string().isoDate().allow(null, ''),
    expiry_date: Joi.string().isoDate().required(),
    supplier_id: Joi.string().uuid().allow(null, ''),
  }),

  createDelivery: Joi.object({
    request_id: Joi.string().uuid().allow(null, ''),
    po_id: Joi.string().uuid().allow(null, ''),
    vehicle_id: Joi.string().uuid().required(),
    driver_id: Joi.string().uuid().required(),
    origin_facility_id: Joi.string().uuid().required(),
    destination_facility_id: Joi.string().uuid().required(),
    estimated_arrival: Joi.string().isoDate().allow(null, ''),
    items: Joi.array().items(Joi.object({
      batch_id: Joi.string().uuid().allow(null, ''),
      medicine_id: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).required(),
    })).min(1).required(),
  }),

  updateGPS: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    speed: Joi.number().min(0).allow(null),
  }),

  recordConsumption: Joi.object({
    facility_id: Joi.string().uuid().allow(null, ''),
    medicine_id: Joi.string().uuid().required(),
    quantity_consumed: Joi.number().integer().min(1).required(),
    period_month: Joi.number().integer().min(1).max(12).required(),
    period_year: Joi.number().integer().min(2000).max(2100).required(),
  }),
  dispense: Joi.object({
    medicine_id: Joi.string().uuid().required(),
    quantity: Joi.number().integer().min(1).required(),
    batch_id: Joi.string().uuid().allow(null, ''),
    patient_id: Joi.string().uuid().allow(null, ''),
    notes: Joi.string().allow('', null),
  }),
};

module.exports = { validate, schemas };
