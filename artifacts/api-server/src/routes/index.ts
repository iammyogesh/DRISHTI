import { Router, type IRouter } from "express";
import healthRouter from "./health";
import drishtiRouter from "./drishti";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(drishtiRouter);

export default router;
