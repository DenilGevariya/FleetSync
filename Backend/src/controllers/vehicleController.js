const vehicleService = require('../services/vehicleService');

const getAll = async (req, res, next) => {
  try {
    const vehicles = await vehicleService.getAll(req.query);
    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.getById(req.params.id);
    res.json({ success: true, data: vehicle });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.create(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Vehicle created.', data: vehicle });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Vehicle updated.', data: vehicle });
  } catch (err) { next(err); }
};

const setStatus = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.setStatus(req.params.id, req.body.status);
    res.json({ success: true, message: 'Vehicle status updated.', data: vehicle });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await vehicleService.remove(req.params.id);
    res.json({ success: true, message: 'Vehicle deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, setStatus, remove };
