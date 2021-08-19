const {
  TextPrompt,
  ComponentDialog,
  WaterfallDialog,
  ChoiceFactory,
} = require("botbuilder-dialogs");

const { LuisRecognizer } = require("botbuilder-ai");

// This is for the i18n stuff
const { i18n } = require("./locales/i18nConfig");

const TEXT_PROMPT = "TEXT_PROMPT";
const GET_PREFFERED_METHOD_OF_CONTACT_STEP =
  "GET_PREFFERED_METHOD_OF_CONTACT_STEP";
const GET_PREFFERED_METHOD_OF_CONTACT_WATERFALL_STEP =
  "GET_PREFFERED_METHOD_OF_CONTACT_WATERFALL_STEP";

const MAX_ERROR_COUNT = 3;

class GetPreferredMethodOfContactStep extends ComponentDialog {
  constructor() {
    super(GET_PREFFERED_METHOD_OF_CONTACT_STEP);

    // Add a text prompt to the dialog stack
    this.addDialog(new TextPrompt(TEXT_PROMPT));

    this.addDialog(
      new WaterfallDialog(GET_PREFFERED_METHOD_OF_CONTACT_WATERFALL_STEP, [
        this.initialStep.bind(this),
        this.finalStep.bind(this),
      ])
    );

    this.initialDialogId = GET_PREFFERED_METHOD_OF_CONTACT_WATERFALL_STEP;
  }

  /**
   * Initial step in the waterfall. This will kick of the ConfirmLookIntoStep step
   *
   * If the confirmSendEmailStep flag is set in the state machine then we can just
   * end this whole dialog
   *
   * If the confirmLookIntoStep flag is set to null then we need to get a response from the user
   *
   * If the user errors out then we're going to set the flag to false and assume they can't / don't
   * want to proceed
   */
  async initialStep(stepContext) {
    // Get the user details / state machine
    const unblockBotDetails = stepContext.options;

    // DEBUG
    // console.log('DEBUG UNBLOCKBOTDETAILS:', unblockBotDetails);

    // Set the text for the prompt
    const standardMsg = i18n.__("getPreferredMethodOfContactStepStandardMsg");

    // Set the text for the retry prompt
    const retryMsg = i18n.__("getPreferredMethodOfContactStepRetryMsg");

    // Check if the error count is greater than the max threshold
    if (
      unblockBotDetails.errorCount.getPreferredMethodOfContactStep >=
      MAX_ERROR_COUNT
    ) {
      // Throw the master error flag
      unblockBotDetails.masterError = true;
      // End the dialog and pass the updated details state machine
      return await stepContext.endDialog(unblockBotDetails);
    }

    // Check the user state to see if unblockBotDetails.confirm_look_into_step is set to null or -1
    // If it is in the error state (-1) or or is set to null prompt the user
    // If it is false the user does not want to proceed
    if (
      unblockBotDetails.getPreferredMethodOfContactStep === null ||
      unblockBotDetails.getPreferredMethodOfContactStep === -1
    ) {
      // Setup the prompt message
      var promptMsg = "";

      // The current step is an error state
      if (unblockBotDetails.getPreferredMethodOfContactStep === -1) {
        promptMsg = retryMsg;
      } else {
        promptMsg = standardMsg;
      }

      // Set the options for the quick reply buttons
      const promptOptions = i18n.__(
        "getPreferredMethodOfContactStepStandardPromptOptions"
      );

      const promptDetails = {
        prompt: ChoiceFactory.forChannel(
          stepContext.context,
          promptOptions,
          promptMsg
        ),
      };

      return await stepContext.prompt(TEXT_PROMPT, promptDetails);
    } else {
      return await stepContext.next(false);
    }
  }

  /**
   * Validation step in the waterfall.
   * We use LUIZ to process the prompt reply and then
   * update the state machine (unblockBotDetails)
   */
  async finalStep(stepContext) {
    // Get the user details / state machine
    const unblockBotDetails = stepContext.options;

    // Language check
    var applicationId = "";
    var endpointKey = "";
    var endpoint = "";

    // Then change LUIZ appID
    if (
      stepContext.context.activity.locale.toLowerCase() === "fr-ca" ||
      stepContext.context.activity.locale.toLowerCase() === "fr-fr"
    ) {
      applicationId = process.env.LuisAppIdFR;
      endpointKey = process.env.LuisAPIKeyFR;
      endpoint = `https://${process.env.LuisAPIHostNameFR}.api.cognitive.microsoft.com`;
    } else {
      applicationId = process.env.LuisAppIdEN;
      endpointKey = process.env.LuisAPIKeyEN;
      endpoint = `https://${process.env.LuisAPIHostNameEN}.api.cognitive.microsoft.com`;
    }

    // LUIZ Recogniser processing
    const recognizer = new LuisRecognizer(
      {
        applicationId: applicationId,
        endpointKey: endpointKey,
        endpoint: endpoint,
      },
      {
        includeAllIntents: true,
        includeInstanceData: true,
      },
      true
    );

    // Call prompts recognizer
    const recognizerResult = await recognizer.recognize(stepContext.context);

    // Setup the possible messages that could go out
    const sendEmailMsg = i18n.__("getPreferredMethodOfContactStepSendEmailMsg");
    const sendTextMsg = i18n.__("getPreferredMethodOfContactStepSendTextMsg");
    const sendBothMsg = i18n.__("getPreferredMethodOfContactStepSendBothMsg");

    // Top intent tell us which cognitive service to use.
    const intent = LuisRecognizer.topIntent(recognizerResult, "None", 0.5);

    switch (intent) {
      // Proceed with Email
      case "promptConfirmSendEmailYes":
      case "promptConfirmChoiceEmail":
        console.log("INTENT: ", intent);
        unblockBotDetails.getPreferredMethodOfContactStep = true;

        await stepContext.context.sendActivity(sendEmailMsg);

        return await stepContext.endDialog(unblockBotDetails);

      // Proceed with Text Message
      case "promptConfirmChoiceText":
        console.log("INTENT: ", intent);
        unblockBotDetails.getPreferredMethodOfContactStep = true;

        await stepContext.context.sendActivity(sendTextMsg);

        return await stepContext.endDialog(unblockBotDetails);

      // Proceed with Both Messages
      case "promptConfirmChoiceBoth":
        console.log("INTENT: ", intent);
        unblockBotDetails.getPreferredMethodOfContactStep = true;

        await stepContext.context.sendActivity(sendBothMsg);

        return await stepContext.endDialog(unblockBotDetails);

      // Could not understand / None intent
      default: {
        // Catch all
        console.log("NONE INTENT");
        unblockBotDetails.getPreferredMethodOfContactStep = -1;
        unblockBotDetails.errorCount.getPreferredMethodOfContactStep++;

        return await stepContext.replaceDialog(
          GET_PREFFERED_METHOD_OF_CONTACT_STEP,
          unblockBotDetails
        );
      }
    }
  }
}

module.exports.GetPreferredMethodOfContactStep =
  GetPreferredMethodOfContactStep;
module.exports.GET_PREFFERED_METHOD_OF_CONTACT_STEP =
  GET_PREFFERED_METHOD_OF_CONTACT_STEP;
