const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const gradepoints = {
  "A+": 10,
  A: 9,
  "B+": 8,
  B: 7,
  C: 6,
  D: 4,
  E: 2,
  F: 0,
};

const fs = require("fs");

let rawdata = fs.readFileSync("config");
let config = JSON.parse(rawdata);

const MongoClient = require("mongodb").MongoClient;
MongoClient.connect(config.mongo_con, {
  useUnifiedTopology: true,
})
  .then((client) => {
    const db = client.db("mdmnode");
    const sessionCollection = db.collection("session");

    app.get("/test", (req, res) => {
      res.send("testing");
    });

    app.post("/addSession", (req, res) => {
      sessionCollection
        .insertOne(req.body)
        .then((result) => {
          res.send(result);
        })
        .catch((error) => res.send(error));
    });
    app.post("/getSession", (req, res) => {
      sessionCollection
        .find()
        .toArray()
        .then((result) => {
          res.send(result);
        })
        .catch((error) => res.send(error));
    });
    app.post("/addStudent", (req, res) => {
      sessionCollection
        .updateOne(
          { _id: req.body.session },
          {
            $set: {
              ["students." + req.body.student.regno]: req.body.student,
            },
          }
        )
        .then((result) => {
          res.send(result);
        })
        .catch((error) => res.send(error));
    });
    app.post("/addCourse", (req, res) => {
      sessionCollection
        .updateOne(
          {
            _id: req.body.session,
          },
          {
            $set: {
              ["students." +
              req.body.regno +
              ".courses." +
              req.body.course.courseID]: req.body.course,
            },
          }
        )
        .then((result) => {
          res.send(result);
        })
        .catch((error) => res.send(error));
    });
    app.post("/addReattempt", (req, res) => {
      sessionCollection
        .updateOne(
          {
            _id: req.body.session,
          },
          {
            $set: {
              ["students." +
              req.body.regno +
              ".courses." +
              req.body.courseid +
              ".reattempt." +
              req.body.reattempt.level]: req.body.reattempt,
            },
          }
        )
        .then((result) => {
          res.send(result);
        })
        .catch((error) => res.send(error));
    });
    app.post("/getcpi", (req, res) => {
      sessionCollection
        .find(
          {
            ["students." + req.body.regno]: {
              $exists: true,
            },
          },
          {
            projection: {
              _id: true,
              ["students." + req.body.regno]: true,
            },
          }
        )
        .toArray()
        .then((result) => {
          var totalCredits = 0.0;
          var totalCreditsScored = 0.0;
          var response = result.map((value, index) => {
            var courses = value.students[req.body.regno].courses;
            var r = Object.keys(courses).reduce(
              (agg, value) => {
                var course = courses[value];
                var credit = course.credits;
                var scored = gradepoints[course.grade];

                // update credit and scored with respect to reattempts

                var r = course.reattempt
                  ? Object.keys(course.reattempt).reduce(
                      (agg, value) => {
                        return {
                          credit: Math.max(
                            agg.credit,
                            course.reattempt[value].credits
                          ),
                          scored: Math.max(
                            agg.scored,
                            gradepoints[course.reattempt[value].grade]
                          ),
                        };
                      },
                      {
                        credit: credit,
                        scored: scored,
                      }
                    )
                  : {
                      credit: credit,
                      scored: scored,
                    };

                credit = r.credit;
                scored = r.scored;

                return {
                  creditScored: agg.creditScored + scored * credit,
                  maxCredits: agg.maxCredits + credit,
                };
              },
              { creditScored: 0.0, maxCredits: 0.0 }
            );

            console.log(totalCreditsScored);
            console.log(totalCredits);
            console.log(r);
            
            totalCreditsScored += r.creditScored;
            totalCredits += r.maxCredits;

            var rp = {
              spi: r.creditScored / r.maxCredits,
              cpi: totalCreditsScored / totalCredits,
            };

            return rp;
            // return cpi spi pair
          });

          res.send(response);
        })
        .catch((error) => res.send(error));
    });

    app.post("/getcourse", (req, res) => {
      console.log(req.body.regno);
      sessionCollection
        .find(
          {
            ["students." + req.body.regno]: {
              $exists: true,
            },
          },
          {
            projection: {
              _id: true,
              ["students." + req.body.regno]: true,
            },
          }
        )
        .toArray()
        .then((result) => {
          console.log(result);
          var totalCredits = 0.0;
          var totalCreditsScored = 0.0;
          var response = result.map((value, index) => {
            console.log(index);
            var courses = value.students[req.body.regno].courses;
            var r = Object.keys(courses).reduce(
              (agg, value) => {
                var course = courses[value];
                var credit = course.credits;
                var scored = gradepoints[course.grade];

                // update credit and scored with respect to reattempts

                var r = course.reattempt
                  ? Object.keys(course.reattempt).reduce(
                      (agg, value) => {
                        return {
                          credit: Math.max(
                            agg.credit,
                            course.reattempt[value].credits
                          ),
                          scored: Math.max(
                            agg.scored,
                            gradepoints[course.reattempt[value].grade]
                          ),
                        };
                      },
                      {
                        credit: credit,
                        scored: scored,
                      }
                    )
                  : {
                      credit: credit,
                      scored: scored,
                    };

                credit = r.credit;
                scored = r.scored;

                return {
                  creditScored: agg.creditScored + scored * credit,
                  maxCredits: agg.maxCredits + credit,
                };
              },
              { creditScored: 0.0, maxCredits: 0.0 }
            );

            totalCreditsScored += r.creditScored;
            totalCredits += r.maxCredits;

            var rp = {
              spi: r.creditScored / r.maxCredits,
              cpi: totalCreditsScored / totalCredits,
            };
            console.log(rp);
            return rp;
            // return cpi spi pair
          });
          console.log("resp");
          console.log(response);
          res.send(response);
        })
        .catch((error) => res.send(error));
    });

    app.listen(3000, () => {
      console.log("listening on 3000");
    });
  })
  .catch(console.error);

app.get("/", function (req, res) {
  console.log(req.query);
  res.send(req.query);
});
