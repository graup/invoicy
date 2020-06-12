import HTML5ToPDF from "html5-to-pdf";
import path from "path";
import YAML from 'yaml';
import { readFileSync } from 'fs';
import Mustache from 'mustache';
import { domainToASCII } from "url";

const __dirname = path.resolve();

function gatherData(filePath) {
  const formatMoney = function(value) {
    return value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');;
  };
  const fileContents = readFileSync(filePath).toString();
  let data = YAML.parse(fileContents);
  data.billToHtml = data['bill-to'].replace(/\n/g, "<br>");
  data.itemPrice = function() {
    return formatMoney(this.qty * this.unit);
  };
  data.unitPrice = function() {
    return formatMoney(this.unit);
  }
  const totalAmount = data.items.reduce((a, b) => a += b.qty * b.unit, 0);
  const amountPaid = data.amountPaid;
  data.totalAmount = function() {
    return formatMoney(totalAmount);
  };
  data.amountPaid = function() {
    return formatMoney(amountPaid || 0);
  }
  data.amountDue = function() {
    return formatMoney(totalAmount - (amountPaid || 0));
  };
  return data;
}

const run = async () => {
  const filePath = process.argv[2][0] === '/' ? process.argv[2] : path.join(process.cwd(), process.argv[2]);
  const fileName = path.basename(filePath);
  const data = gatherData(filePath);

  const templatePath = path.join(__dirname, "template", "index.html");
  const html = Mustache.render(readFileSync(templatePath).toString(), data);

  const html5ToPDF = new HTML5ToPDF({
    inputBody: html,
    outputPath: path.join(__dirname, "output", fileName+".pdf"),
    templatePath: path.join(__dirname, "template"),
    include: [
      path.join(__dirname, "template", "styles.css"),
    ],
    pdf: {
      format: "A4",
    },
  });
 
  await html5ToPDF.start();
  await html5ToPDF.build();
  await html5ToPDF.close();
  process.exit(0);
}

run();