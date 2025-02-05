import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class CustomMetricsMiddleware implements NestMiddleware {
  constructor() { // @InjectMetric('count') public appCounter: Counter<string>, // Must be identical to those declared in our AppModule
    // Customizing the names and help messages for metrics
  }

  use(req: Request, res: Response, next: NextFunction) {
    req['start'] = Date.now();
    // Incrementing custom counter and gauge
    // this.appCounter.labels(req.method, req.originalUrl).inc();
    // this.appGauge.inc();

    // Recording start time for measuring duration
    // const startTime = Date.now();
    //
    // // Setting up a callback for when the response finishes
    // res.on("finish", () => {
    //   // Calculating the duration and recording it in the custom duration gauge
    //   const endTime = Date.now();
    //   const duration = endTime - startTime;
    //   this.customDurationGauge
    //     .labels(req.method, req.originalUrl)
    //     .set(duration);
    //
    //   // Incrementing the custom errors counter based on the response status code
    //   this.customErrorsCounter
    //     .labels(req.method, req.originalUrl, res.statusCode.toString())
    //     .inc();
    // });

    // Continuing with the middleware chain
    next();
  }
}
