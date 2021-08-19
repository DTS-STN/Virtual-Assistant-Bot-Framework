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
const CONFIRM_NOTIFY_ROE_RECEIVED_STEP = "CONFIRM_NOTIFY_ROE_RECEIVED_STEP";
const CONFIRM_NOTIFY_ROE_RECEIVED_STEP_WATERFALL_STEP =
  "GCONFIRM_NOTIFY_ROE_RECEIVED_STEP_WATERFALL_STEP";

const MAX_ERROR_COUNT = 3;

class ConfirmNotifyROEReceivedStep extends ComponentDialog {
  constructor() {
    super(CONFIRM_NOTIFY_ROE_RECEIVED_STEP);

    // Add a text prompt to the dialog stack
    this.addDialog(new TextPrompt(TEXT_PROMPT));

    this.addDialog(
      new WaterfallDialog(CONFIRM_NOTIFY_ROE_RECEIVED_STEP_WATERFALL_STEP, [
        this.initialStep.bind(this),
        this.finalStep.bind(this),
      ])
    );

    this.initialDialogId = CONFIRM_NOTIFY_ROE_RECEIVED_STEP_WATERFALL_STEP;
  }

  /**
   * Kick off the dialog by asking for an email address
   *
   */
  async initialStep(stepContext) {
    // Get the user details / state machine
    const unblockBotDetails = stepContext.options;

    // DEBUG
    // console.log('DEBUG UNBLOCKBOTDETAILS in confirmNotifyROEReceivedStep:', unblockBotDetails);

    // Set the text for the prompt
    const standardMsg = i18n.__("confirmNotifyROEReceivedStepStandardMsg");

    // Set the text for the retry prompt
    const retryMsg = i18n.__("confirmNotifyROEReceivedStepRetryMsg");

    // Check if the error count is greater than the max threshold
    if (
      unblockBotDetails.errorCount.confirmNotifyROEReceivedStep >=
      MAX_ERROR_COUNT
    ) {
      // Throw the master error flag
      unblockBotDetails.masterError = true;

      // Set master error message to send
      const errorMsg = i18n.__("confirmNotifyROEReceivedStepErrorMsg");

      // Send master error message
      await stepContext.context.sendActivity(errorMsg);

      // End the dialog and pass the updated details state machine
      return await stepContext.endDialog(unblockBotDetails);
    }

    // Check the user state to see if unblockBotDetails.getAndSendEmailStep is set to null or -1
    // If it is in the error state (-1) or or is set to null prompt the user
    // If it is false the user does not want to proceed
    if (
      unblockBotDetails.confirmNotifyROEReceivedStep === null ||
      unblockBotDetails.confirmNotifyROEReceivedStep === -1
    ) {
      // Setup the prompt message
      var promptMsg = "";

      // The current step is an error state
      if (unblockBotDetails.confirmNotifyROEReceivedStep === -1) {
        promptMsg = retryMsg;
      } else {
        promptMsg = standardMsg;
      }

      const promptOptions = i18n.__(
        "confirmNotifyROEReceivedStepStandardPromptOptions"
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
   *
   *
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

    const closeMsg = i18n.__("confirmNotifyROEReceivedStepCloseMsg");

    switch (intent) {
      // Proceed
      // Not - adding these extra intent checks because of a bug with the french happy path
      case "promptConfirmSendEmailYes":
      case "promptConfirmNotifyYes":
      case "promptConfirmYes":
        console.log("INTENT: ", intent);
        unblockBotDetails.confirmNotifyROEReceivedStep = true;
        return await stepContext.endDialog(unblockBotDetails);

      // Don't Proceed
      case "promptConfirmNotifyNo":
      case "promptConfirmNo":
        console.log("INTENT: ", intent);
        unblockBotDetails.confirmNotifyROEReceivedStep = false;

        await stepContext.context.sendActivity(closeMsg);

        return await stepContext.endDialog(unblockBotDetails);

      // Could not understand / None intent
      default: {
        // Catch all
        console.log("NONE INTENT");
        unblockBotDetails.confirmNotifyROEReceivedStep = -1;
        unblockBotDetails.errorCount.confirmNotifyROEReceivedStep++;

        return await stepContext.replaceDialog(
          CONFIRM_NOTIFY_ROE_RECEIVED_STEP,
          unblockBotDetails
        );
      }
    }
  }
}

module.exports.ConfirmNotifyROEReceivedStep = ConfirmNotifyROEReceivedStep;
module.exports.CONFIRM_NOTIFY_ROE_RECEIVED_STEP =
  CONFIRM_NOTIFY_ROE_RECEIVED_STEP;
