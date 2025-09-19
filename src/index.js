const checkPermission = () => async (req, res, next) => {
  // If no user, return forbidden error
  if (!req.accountability?.user) {
    return res.status(401).send(`Unauthenticated`);
  }

  // If a role ID is specified in environment,
  // and current accountability object has
  // that role, allow proceeding
  if (
    process.env.DESTROY_SESSION_PERMITTED_ROLE &&
    req.accountability.roles.includes(
      process.env.DESTROY_SESSION_PERMITTED_ROLE
    )
  ) {
    return next();
  }

  // Otherwise, only allow admin
  if (req.accountability?.admin === true) {
    return next();
  }

  // Default to forbidden error
  return res.status(403).send(`Forbidden`);
};

// Only allow deleting by properties that
// we can assume are unique
const allowedByParams = ["id", "email", "external_identifier"];

const respond = (res, destroyedCount) => {
  return res.status(200).json({ destroyedCount });
};

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
          return respond(res, 0);
        }

        // Delete all records from the session database
        // that references the user in question
        const destroyedCount = await database
          .delete()
          .from("directus_sessions")
          .where("user", user.id);

        return respond(res, destroyedCount);
      } catch (error) {
        logger.error(error, "destroy-session error");
        return res
          .status(500)
          .json({ error: error.message || "Unknown error" });
      }
    });
  },
};
