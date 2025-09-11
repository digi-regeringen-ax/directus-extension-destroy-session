const checkPermission = () => async (req, res, next) => {
  if (!req.accountability?.user) {
    return res.status(401).send(`Unauthenticated`);
  }

  // TODO support role by env

  if (req.accountability?.admin !== true) {
    return res.status(403).send(`Forbidden`);
  }

  return next();
};

// Only allow deleting by properties that
// we can assume are unique
const allowedByParams = ["id", "email", "external_identifier"];

export default {
  id: "destroy-session",
  handler: (router, { services, logger, getSchema, database }) => {
    router.use(checkPermission());

    router.post("/", async (req, res) => {
      try {
        // Set up services
        const { UsersService } = services;
        const usersService = new UsersService({
          schema: await getSchema(),
          accountability: req.accountability,
        });

        const byParam = req.body?.by + ""; // to string
        if (!allowedByParams.includes(byParam)) {
          return res.status(400).json({
            error: `Invalid value for param 'by' - must be one of ${allowedByParams.join(
              ", "
            )}`,
          });
        }

        // The value to look for
        const identifierParam = (req.body?.identifier || "") + ""; // to string

        // First check that user exists
        const getRes = await usersService.readByQuery({
          filter: { [byParam]: { _eq: identifierParam } },
          fields: ["id", "email"],
          limit: 1,
        });

        const user = getRes[0];
        if (!user) {
          return res.status(404).json({
            error: `User not found.`,
          });
        }

        // Delete all records from the session database
        // that references the user in question
        const deleteRes = await database
          .delete()
          .from("directus_sessions")
          .where("user", user.id);

        return res.json(deleteRes);
      } catch (error) {
        logger.error(error, "destroy-session error");
        return res
          .status(500)
          .json({ error: error.message || "Unknown error" });
      }
    });
  },
};
