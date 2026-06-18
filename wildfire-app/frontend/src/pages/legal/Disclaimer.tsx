import { AlertTriangle } from "lucide-react";
import React from "react";

const Disclaimer: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Disclaimer</h1>
        </div>
        <p className="text-sm text-muted-foreground">Last updated: February 4, 2026</p>
      </header>
      <div className="prose prose-lg max-w-none text-foreground">
        <p>
          The wildfire risk simulations produced by the WildfireApp platform are based on data
          from sources such as OpenStreetMap (OSM), MERRA-2, and other public datasets. While we
          strive for accuracy, these simulations are intended for informational and research
          purposes and should not be solely relied upon for emergency response, evacuation
          planning, or other safety-critical decisions. To continuously improve the platform, we
          analyze user-generated models and outcomes to refine our estimation techniques and data
          sources.
        </p>

        <h3 id="accuracy-of-models">Accuracy of Wildfire Simulations</h3>
        <p>
          The wildfire models provided by and created via the WildfireApp platform are based on
          public data from various sources. While we strive to ensure the accuracy and
          reliability of the data used in these models, the following disclaimers apply:
        </p>
        <ol>
          <li>
            <p>
              <strong>Data Sources and Assumptions</strong>
            </p>
            <ul>
              <li>
                <strong>OpenStreetMap (OSM)</strong>: OSM data is crowd-sourced and may contain
                inaccuracies or be incomplete. We use this data as a foundational geographic
                reference, but we cannot guarantee its absolute accuracy.
              </li>
              <li>
                <strong>MERRA-2</strong>: The Modern-Era Retrospective Analysis for Research and
                Applications, Version 2 (MERRA-2), provides climate and atmospheric data. This
                data is based on estimations and historical records, which may not reflect
                current conditions.
              </li>
              <li>
                <strong>Vegetation, terrain, and weather datasets</strong>: Inputs such as fuel
                models, topography, and meteorological observations are sourced from public
                providers and may be subject to updates, gaps, or revisions.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>Estimated Values</strong>
            </p>
            <ul>
              <li>
                The estimates and configurations used in our simulations are based on available
                data and industry-standard techniques. They are intended to provide a general
                understanding of potential wildfire scenarios but should not be taken as precise
                or definitive predictions.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>Limitations and Use</strong>
            </p>
            <ul>
              <li>
                The wildfire simulations generated through our platform are intended for
                informational, research, and educational purposes. They must not be used as the
                sole basis for emergency response, evacuation, land-use, or other safety-critical
                decisions.
              </li>
              <li>
                Users should consult qualified fire management professionals and consider local
                conditions and regulations before acting on any simulation results.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>No Warranty</strong>
            </p>
            <ul>
              <li>
                WildfireApp provides these simulations "as is" without any warranties, express or
                implied. We do not warrant that the models will be error-free, completely
                accurate, or applicable to every situation.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>User Responsibility</strong>
            </p>
            <ul>
              <li>
                Users are responsible for verifying the accuracy and suitability of the
                simulations for their specific needs. WildfireApp shall not be liable for any
                losses or damages arising from the use of these simulations.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>Changes and Updates</strong>
            </p>
            <ul>
              <li>
                Data sources and methodologies may change over time. WildfireApp reserves the
                right to update the models and underlying data without prior notice to reflect
                new information or improvements in modeling techniques.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>Contact Information</strong>
            </p>
            <ul>
              <li>
                If you have any questions or concerns about the accuracy or use of the wildfire
                simulations, please contact our support team at{" "}
                <a href="mailto:wildfire-app@th-deg.de">wildfire-app&#64;th-deg.de</a>.
              </li>
            </ul>
          </li>
        </ol>
        <p>
          By using the WildfireApp platform, you acknowledge and agree to the terms of this
          disclaimer. Your use of the platform constitutes acceptance of this disclaimer and its
          limitations.
        </p>

        <hr />

        <h3 id="use-of-generated-models-for-system-improvement">
          Use of Generated Models for System Improvement
        </h3>
        <p>
          WildfireApp is committed to continuously improving the accuracy and reliability of our
          wildfire simulation platform. To achieve this, we analyze user-generated models and
          their outcomes to identify areas for enhancement. By using the platform, you agree to
          the following:
        </p>
        <ol>
          <li>
            <p>
              <strong>Error Analysis</strong>
            </p>
            <ul>
              <li>
                We perform error analysis on the generated models to identify discrepancies
                between predicted and observed outcomes. This helps us understand the limitations
                and potential inaccuracies in our current data sources and estimation techniques.
              </li>
              <li>
                User feedback and reported errors are invaluable in refining our models. We
                encourage users to report any anomalies or inaccuracies they encounter.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>Model Analysis</strong>
            </p>
            <ul>
              <li>
                We analyze the performance and results of user-generated models to identify
                patterns and insights that can lead to improvements in our modeling algorithms.
              </li>
              <li>
                This analysis includes studying the effectiveness of different configurations and
                inputs provided by users to enhance the robustness and versatility of our
                simulations.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>Data Utilization</strong>
            </p>
            <ul>
              <li>
                Data from user-generated models may be aggregated and anonymized for the purpose
                of improving the platform. This includes refining estimation techniques, updating
                data sources, and enhancing the overall accuracy of the models.
              </li>
              <li>
                By contributing your data, you help us advance the field of wildfire modeling and
                develop more accurate and reliable tools for future use.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>Privacy and Security</strong>
            </p>
            <ul>
              <li>
                All data utilized for system improvement purposes is handled in accordance with
                our Privacy Policy. Personal identifiers are removed to ensure user anonymity.
              </li>
              <li>
                We implement strict security measures to protect the data used in our analyses
                and ensure it is only accessible to authorized personnel involved in system
                development and improvement.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>User Feedback</strong>
            </p>
            <ul>
              <li>
                We actively seek and value user feedback to guide our improvement efforts. Users
                are encouraged to share their experiences, suggestions, and any issues
                encountered while using the platform.
              </li>
              <li>
                Feedback can be provided through the in-app feedback form or by emailing the
                support team.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>Continuous Improvement Commitment</strong>
            </p>
            <ul>
              <li>
                WildfireApp is dedicated to ongoing development and enhancement of our platform.
                Insights gained from error and model analysis are integrated into regular updates
                to provide users with the most accurate and effective wildfire modeling tools
                available.
              </li>
            </ul>
          </li>
          <li>
            <p>
              <strong>Collaboration and Research</strong>
            </p>
            <ul>
              <li>
                We may collaborate with academic institutions, fire management agencies, and
                research organizations to further enhance our modeling techniques and data
                accuracy. Contributions from user-generated models are invaluable in these
                collaborative efforts.
              </li>
            </ul>
          </li>
        </ol>
        <p>
          By using the WildfireApp platform and contributing your models, you play a crucial role
          in helping us improve our system. We appreciate your participation and commitment to
          advancing wildfire modeling technology.
        </p>
        <p>
          If you have any questions or would like to learn more about how your data is used for
          system improvement, please contact our support team at{" "}
          <a href="mailto:wildfire-app@th-deg.de">wildfire-app&#64;th-deg.de</a>.
        </p>
      </div>
    </div>
  );
};

export default Disclaimer;
