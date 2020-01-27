import * as React from "react";
import { connect } from "react-redux";
import classnames from "classnames";

import SelectableCard from "../../components/SelectableCard";
import Notification from "../../components/Notification";
import Title from "../../components/Title";
import { MAX_PAGES_ALLOWED } from "../../utils/constants";

import styles from "./styles.module.css";

import { setDetailPageAction } from "../../actions/wizardInfoActions/setDetailsPage";

import { IOption } from "../../types/option";
import { ISelected } from "../../types/selected";
import { Dispatch } from "redux";
import RootAction from "../../actions/ActionType";
import { AppState } from "../../reducers";

import { isAddPagesModalOpenSelector } from "../../selectors/modalSelector";
import { ISelectedPages, mapStateSelectedPages } from "../../selectors/wizardSelectionSelector/wizardSelectionSelector";

import { InjectedIntl, defineMessages, injectIntl } from "react-intl";
import { inferItemName} from "../../utils/infer/itemName";
import messages from "./messages";

interface ICount {
  [key: string]: number;
}

interface IProps {
  intl: InjectedIntl;
}

interface ISelectOptionProps {
  title: string;
  description: string;
  internalName?: string;
  selectCard?: (card: ISelected) => void;
  selectedCardIndices: number[];
  currentCardData?: ISelected[];
  selectOptions?: (cards: ISelected[]) => void;
  options: IOption[];
  multiSelect: boolean;
  isFrameworkSelection: boolean;
  isPagesSelection: boolean;
  cardTypeCount?: ICount;
  handleCountUpdate?: (cardCount: ICount) => any;
}

interface ISelectOptionState {
  selectedCardIndices: number[];
  pageOutOfBounds: boolean;
  description: string;
}

interface IDispatchProps {
  setDetailPage: (detailPageInfo: IOption) => void;
}

interface IStateProps {
  isAddPagesModalOpen: boolean;
}

type Props = IDispatchProps & ISelectOptionProps & IStateProps & ISelectedPages & IProps;

class SelectOption extends React.Component<Props, ISelectOptionState> {
  constructor(props: Props) {
    super(props);
    const { selectedCardIndices } = props;
    this.state = {
      selectedCardIndices,
      pageOutOfBounds: false,
      description: props.intl.formatMessage(messages.limitedPages)
    };
  }
  public componentDidMount() {
    const { selectCard, selectOptions, selectedCardIndices } = this.props;
    if (selectCard) {
      this.exchangeOption(selectedCardIndices[0]);
      this.setState({
        selectedCardIndices
      });
    } else if (selectOptions) {
      if (selectedCardIndices.length === 0) {
        this.onCardClick(0);
        this.addPage(0);
      }
      this.setState({
        selectedCardIndices
      });
    }
  }
  public isCardSelected(cardNumber: number): boolean {
    const { selectedCardIndices } = this.props;
    if (selectedCardIndices) {
      return selectedCardIndices.includes(cardNumber);
    }
    return this.state.selectedCardIndices.includes(cardNumber);
  }

  public createTitle(optionIndexContainingData: number, count: number) {
    const { title } = this.props.options[optionIndexContainingData];
    if (count === 1) {
      return title;
    }
    return `${title}${count}`;
  }

  public async mapIndexToCardInfo(
    count: number,
    internalName: string,
    optionIndexContainingData: number
  ) {
    const { defaultName, licenses, author } = this.props.options[
      optionIndexContainingData
    ];
    const selectedPages:Array<any> = this.props.selectedPages;
    const title = await inferItemName(defaultName ? defaultName : "", selectedPages);
    const cardInfo: ISelected = {
      title: title as string,
      internalName,
      id: title as string,
      defaultName,
      isValidTitle: true,
      licenses,
      author,
      ref:React.createRef()
    };
    return cardInfo;
  }

  public addOption(
    cardNumber: number,
    cardCount: number,
    internalName: string
  ) {
    const { selectedCardIndices, currentCardData, selectOptions } = this.props;
    selectedCardIndices.push(cardNumber);
    const suggesteName="";
    if (selectOptions && currentCardData) {
      this.mapIndexToCardInfo(cardCount, internalName, cardNumber).then(card=>{
        const currentCards = currentCardData.splice(0);
        currentCards.push(card);
        selectOptions(currentCards);
        this.setState({selectedCardIndices});
        card.ref.current.focus();
      });
    }else{
      this.setState({selectedCardIndices});
    }
  }

  public removeOption(internalName: string) {
    const { selectedCardIndices, currentCardData, selectOptions } = this.props;
    if (selectOptions && currentCardData && currentCardData.length > 1) {
      const size = currentCardData.length;
      const currentCards = currentCardData.splice(0);
      for (let i = size - 1; i >= 0; i--) {
        if (currentCards[i].internalName === internalName) {
          currentCards.splice(i, 1);
          break;
        }
      }
      selectOptions(currentCards);
      this.setState({
        selectedCardIndices
      });
    }
  }

  public exchangeOption(cardNumber: number) {
    const { selectedCardIndices } = this.state;
    const { selectCard, options } = this.props;
    selectedCardIndices.pop();
    selectedCardIndices.push(cardNumber);
    const shorthandVersionLabel = `v${options[cardNumber].version || "1.0"}`;
    const { title, internalName, licenses, author } = this.props.options[
      cardNumber
    ];

    if (selectCard) {
      selectCard({
        internalName,
        title: title as string,
        version: shorthandVersionLabel,
        licenses,
        author
      });
    }
    this.setState({
      selectedCardIndices
    });
  }

  public onCardClick(cardNumber: number) {
    const { options, multiSelect } = this.props;
    const { unselectable } = options[cardNumber];
    if (unselectable) {
      return;
    }
    if (!multiSelect) {
      this.exchangeOption(cardNumber);
    }
  }

  public getCardCount = (internalName: string) => {
    const { selectedCardIndices, multiSelect, options } = this.props;
    if (selectedCardIndices && multiSelect) {
      return selectedCardIndices.reduce((cardCount: number, card: number) => {
        if (options[card].internalName === internalName) {
          return cardCount + 1;
        }
        return cardCount;
      }, 0);
    }
  };

  public addPage = (cardNumber: number) => {
    const {
      options,
      cardTypeCount,
      handleCountUpdate,
      currentCardData,
      intl
    } = this.props;
    const { internalName } = options[cardNumber];
    if (currentCardData && currentCardData.length >= MAX_PAGES_ALLOWED) {
      this.setState({
        pageOutOfBounds: true,
        description: intl.formatMessage(messages.overlimitPages)
      });
      return;
    }
    this.setState({
      pageOutOfBounds: false,
      description: intl.formatMessage(messages.limitedPages)
    });
    if (cardTypeCount && handleCountUpdate) {
      cardTypeCount[internalName] = cardTypeCount[internalName]
        ? cardTypeCount[internalName] + 1
        : 1;
      handleCountUpdate(cardTypeCount);
      this.addOption(cardNumber, cardTypeCount[internalName], internalName);
    }
  };

  public removePage = (cardNumber: number) => {
    const {
      options,
      currentCardData,
      cardTypeCount,
      handleCountUpdate,
      intl
    } = this.props;
    const { internalName } = options[cardNumber];
    if (currentCardData && currentCardData.length <= 1) {
      this.setState({
        pageOutOfBounds: true,
        description: intl.formatMessage(messages.noPageGeneration)
      });
      return;
    }
    this.setState({
      pageOutOfBounds: false,
      description: intl.formatMessage(messages.limitedPages)
    });
    if (
      cardTypeCount &&
      handleCountUpdate &&
      currentCardData &&
      currentCardData.length > 1
    ) {
      this.removeOption(internalName);
    }
  };

  public render() {
    const {
      title,
      options,
      setDetailPage,
      isFrameworkSelection,
      isPagesSelection,
      isAddPagesModalOpen,
      intl
    } = this.props;
    const { pageOutOfBounds, description } = this.state;
    return (
      <div>
        <Title>{title}</Title>
        {isPagesSelection && (
          <div
            className={classnames(styles.description, {
              [styles.borderGreen]: !pageOutOfBounds,
              [styles.borderYellow]: pageOutOfBounds
            })}
          >
            <Notification
              showWarning={pageOutOfBounds}
              text={description}
              altMessage={intl.formatMessage(messages.iconAltMessage)}
            />
          </div>
        )}
        <div
          className={classnames(styles.container, {
            [styles.modalContainer]: isAddPagesModalOpen
          })}
        >
          {options.map((option, cardNumber) => {
            const {
              svgUrl,
              title,
              body,
              unselectable,
              internalName,
              version
            } = option;
            return (
              <SelectableCard
                key={`${cardNumber} ${title}`}
                isFrameworkSelection={isFrameworkSelection}
                isPagesSelection={isPagesSelection}
                onCardClick={(cardNumber: number) => {
                  this.onCardClick(cardNumber);
                }}
                onDetailsClick={setDetailPage}
                option={option}
                cardNumber={cardNumber}
                selected={this.isCardSelected(cardNumber)}
                iconPath={svgUrl}
                iconStyles={styles.icon}
                title={title as string}
                body={body as string}
                version={version}
                disabled={unselectable}
                clickCount={this.getCardCount(internalName)}
                addPage={(cardNumber: number) => this.addPage(cardNumber)}
                showLink={!isAddPagesModalOpen}
              />
            );
          })}
        </div>
      </div>
    );
  }
}

const mapStateToPropsOpenModal = (state: AppState): IStateProps => ({
  isAddPagesModalOpen: isAddPagesModalOpenSelector(state)
});

const mapDispatchToProps = (
  dispatch: Dispatch<RootAction>
): IDispatchProps => ({
  setDetailPage: (detailPageInfo: IOption) => {
    dispatch(setDetailPageAction(detailPageInfo));
  }
});

export default connect(
  mapStateToPropsOpenModal && mapStateSelectedPages,
  mapDispatchToProps
)(injectIntl(SelectOption));
