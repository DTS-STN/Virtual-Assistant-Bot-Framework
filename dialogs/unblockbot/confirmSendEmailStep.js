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
const CONFIRM_SEND_EMAIL_STEP = "CONFIRM_SEND_EMAIL_STEP";
const CONFIRM_SEND_EMAIL_STEP_WATERFALL_STEP =
  "CONFIRM_SEND_EMAIL_STEP_WATERFALL_STEP";

const MAX_ERROR_COUNT = 3;

class ConfirmSendEmailStep extends ComponentDialog {
  constructor() {
    super(CONFIRM_SEND_EMAIL_STEP);

    // Add a text prompt to the dialog stack
    this.addDialog(new TextPrompt(TEXT_PROMPT));

    this.addDialog(
      new WaterfallDialog(CONFIRM_SEND_EMAIL_STEP_WATERFALL_STEP, [
        this.initialStep.bind(this),
        this.finalStep.bind(this),
      ])
    );

    this.initialDialogId = CONFIRM_SEND_EMAIL_STEP_WATERFALL_STEP;
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
    // console.log('DEBUG UNBLOCKBOTDETAILS:', unblockBotDetails.errorCount.confirmSendEmailStep);

    // Set the text for the prompt
    const standardMsg = i18n.__("confirmSendEmailStepStandardMsg");

    // Set the text for the retry prompt
    const retryMsg = i18n.__("confirmSendEmailStepRetryMsg");

    // Set the text for the prompt
    const queryMsg = i18n.__("confirmSendEmailStepQueryMsg"); //'If you like, I can send Initech a follow-up email from the Government of Canada. That usually does the trick 😉';

    // Check if the error count is greater than the max threshold
    if (unblockBotDetails.errorCount.confirmSendEmailStep >= MAX_ERROR_COUNT) {
      // Throw the master error flag
      unblockBotDetails.masterError = true;

      // Set error message to send
      const errorMsg = i18n.__("masterErrorMsg");

      // Send error message
      await stepContext.context.sendActivity(errorMsg);

      // End the dialog and pass the updated details state machine
      return await stepContext.endDialog(unblockBotDetails);
    }

    // Check the user state to see if unblockBotDetails.confirm_look_into_step is set to null or -1
    // If it is in the error state (-1) or or is set to null prompt the user
    // If it is false the user does not want to proceed
    if (
      unblockBotDetails.confirmSendEmailStep === null ||
      unblockBotDetails.confirmSendEmailStep === -1
    ) {
      // TODO: Refactor this - has to be a better way
      // If the flag is set to null then the step hasn't run before
      if (unblockBotDetails.confirmSendEmailStep === null) {
        await stepContext.context.sendActivity(standardMsg);
      }

      // Setup the prompt message
      var promptMsg = "";

      // The current step is an error state
      if (unblockBotDetails.confirmSendEmailStep === -1) {
        promptMsg = retryMsg;
      } else {
        promptMsg = queryMsg;
      }

      const promptOptions = i18n.__(
        "confirmSendEmailStepStandardPromptOptions"
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

    // Top intent tell us which cognitive service to use.
    const intent = LuisRecognizer.topIntent(recognizerResult, "None", 0.5);

    // This message is sent if the user selects that they don't want to continue
    const closeMsg = i18n.__("confirmSendEmailStepCloseMsg");

    switch (intent) {
      // Proceed
      case "promptConfirmYes":
      case "promptConfirmSendEmailYes":
        console.log("INTENT: ", intent);
        unblockBotDetails.confirmSendEmailStep = true;
        return await stepContext.endDialog(unblockBotDetails);

      // Don't Proceed
      case "promptConfirmNo":
      case "promptConfirmSendEmailNo":
        console.log("INTENT: ", intent);
        unblockBotDetails.confirmSendEmailStep = false;

        await stepContext.context.sendActivity(closeMsg);

        return await stepContext.endDialog(unblockBotDetails);

      // Could not understand / None intent
      default: {
        // Catch all
        console.log("NONE INTENT");
        unblockBotDetails.confirmSendEmailStep = -1;
        unblockBotDetails.errorCount.confirmSendEmailStep++;

        return await stepContext.replaceDialog(
          CONFIRM_SEND_EMAIL_STEP,
          unblockBotDetails
        );
      }
    }
  }
}

module.exports.ConfirmSendEmailStep = ConfirmSendEmailStep;
module.exports.CONFIRM_SEND_EMAIL_STEP = CONFIRM_SEND_EMAIL_STEP;
