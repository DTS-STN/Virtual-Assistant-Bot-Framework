// State machine to track a users progression through
// the unblockbot dialog conversation flow
//

class UnblockBotDetails {
  constructor() {
    // Master error - flag that is thrown when we hit a critical error in the conversation flow
    this.masterError = null;

    // [STEP 1] Flag that confirms the user wants us to look into their file
    this.confirmLookIntoStep = null;

    // [STEP 2] Flag that confirms the user wants us to send an email
    this.confirmSendEmailStep = null;

    // [STEP 3] Get and send an email
    this.getAndSendEmailStep = null;

    // [STEP 4] Determine if the user wants to be notified
    this.confirmNotifyROEReceivedStep = null;

    // [STEP 5] Get preferred method of contact
    this.getPreferredMethodOfContactStep = null;

    // State machine that stores the error counts of each step
    this.errorCount = {
      confirmLookIntoStep: 0,
      confirmSendEmailStep: 0,
      getAndSendEmailStep: 0,
      confirmNotifyROEReceivedStep: 0,
      getPreferredMethodOfContactStep: 0,
    };

    // TODO: Refactor and add an object that tracks status perhaps something like below
    /*
        this.currentStep = '';
        this.steps = [
            'confirmLookIntoStep',
            'confirmSendEmailStep',
            'getAndSendEmailStep',
            'confirmNotifyROEReceivedStep',
        ]
        */
  }
}

module.exports.UnblockBotDetails = UnblockBotDetails;
