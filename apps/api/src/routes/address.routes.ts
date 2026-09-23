import { Router } from 'express';
import { addressController } from '../controllers/address.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createAddressSchema, updateAddressSchema } from '../validators/address.validator';

const router = Router();

// All address routes require user authentication
router.use(requireAuth);

router.get('/', addressController.getAddresses.bind(addressController));
router.get('/:id', addressController.getAddressById.bind(addressController));
router.post('/', validateRequest({ body: createAddressSchema }), addressController.createAddress.bind(addressController));
router.put('/:id', validateRequest({ body: updateAddressSchema }), addressController.updateAddress.bind(addressController));
router.delete('/:id', addressController.deleteAddress.bind(addressController));
router.patch('/:id/default', addressController.setDefaultAddress.bind(addressController));

export default router;
