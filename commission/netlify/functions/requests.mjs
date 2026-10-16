import handler from '../../api/index.js';
import {nodeResponse} from '../adapter.mjs';
export default request=>nodeResponse(handler,request);
